import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import client from "@/lib/personize/client";

const BATCH_LIMIT = 50;

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === process.env.API_SECRET;
}

function getServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getContactsCollectionId(): string {
  const id = process.env.PERSONIZE_CONTACTS_COLLECTION_ID;
  if (!id) {
    throw new Error(
      "PERSONIZE_CONTACTS_COLLECTION_ID environment variable is required"
    );
  }
  return id;
}

function buildMapping() {
  const collectionId = getContactsCollectionId();
  const prop = (sourceField: string) => ({
    sourceField,
    collectionId,
    collectionName: "Contacts",
    extractMemories: false,
  });

  return {
    entityType: "contact",
    email: "email",
    properties: {
      email: prop("email"),
      full_name: prop("full_name"),
      job_title: prop("job_title"),
      company_name: prop("company_name"),
      linkedin_url: prop("linkedin_url"),
      phone: prop("phone"),
      source: prop("source"),
    },
  };
}

interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  company: string | null;
  linkedin_url: string | null;
  phone: string | null;
  source: string;
}

function contactToRow(contact: ContactRow): Record<string, unknown> {
  return {
    email: contact.email ?? "",
    full_name: contact.name ?? "",
    job_title: contact.role ?? "",
    company_name: contact.company ?? "",
    linkedin_url: contact.linkedin_url ?? "",
    phone: contact.phone ?? "",
    source: contact.source ?? "n8n-ingest",
  };
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceRoleClient();

  try {
    // Fetch unmemorized contacts
    const { data: contacts, error: fetchError } = await supabase
      .from("contacts")
      .select("id, name, email, role, company, linkedin_url, phone, source")
      .is("personize_synced_at", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) {
      console.error("[API] /api/personize/sync-contacts fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch contacts", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!contacts || contacts.length === 0) {
      // Count remaining to confirm none left
      const { count } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .is("personize_synced_at", null);

      return NextResponse.json({
        success: true,
        synced: 0,
        failed: 0,
        remaining: count ?? 0,
      });
    }

    const mapping = buildMapping();
    const rows = contacts.map((c) => contactToRow(c));

    let synced = 0;
    let failed = 0;
    const failedIds: string[] = [];

    // Memorize as a single batch (max 50)
    try {
      const result = await client.memory.memorizeBatch({
        source: "n8n-ingest",
        mapping,
        rows,
      });

      // On success, mark all contacts as memorized
      const recordIds: Record<string, string> =
        (result as { recordIds?: Record<string, string> })?.recordIds ?? {};

      for (const contact of contacts) {
        const recordId = recordIds[contact.id] ?? recordIds[contact.email ?? ""] ?? null;
        const { error: updateError } = await supabase
          .from("contacts")
          .update({
            personize_synced_at: new Date().toISOString(),
            ...(recordId ? { personize_record_id: recordId } : {}),
          })
          .eq("id", contact.id);

        if (updateError) {
          console.error(
            `[API] /api/personize/sync-contacts update failed for ${contact.id}:`,
            updateError
          );
          failed++;
          failedIds.push(contact.id);
        } else {
          synced++;
        }
      }
    } catch (batchError) {
      // Batch failed — try individual contacts
      console.error(
        "[API] /api/personize/sync-contacts batch failed, falling back to individual:",
        batchError
      );

      for (const contact of contacts) {
        try {
          const singleRow = contactToRow(contact);
          await client.memory.memorizeBatch({
            source: "n8n-ingest",
            mapping,
            rows: [singleRow],
          });

          const { error: updateError } = await supabase
            .from("contacts")
            .update({ personize_synced_at: new Date().toISOString() })
            .eq("id", contact.id);

          if (updateError) {
            console.error(
              `[API] /api/personize/sync-contacts update failed for ${contact.id}:`,
              updateError
            );
            failed++;
            failedIds.push(contact.id);
          } else {
            synced++;
          }
        } catch (individualError) {
          console.error(
            `[API] /api/personize/sync-contacts memorize failed for ${contact.id}:`,
            individualError
          );
          failed++;
          failedIds.push(contact.id);
        }
      }
    }

    // Count remaining
    const { count: remaining } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .is("personize_synced_at", null);

    return NextResponse.json({
      success: true,
      synced,
      failed,
      remaining: remaining ?? 0,
      ...(failedIds.length > 0 ? { failedIds } : {}),
    });
  } catch (error) {
    console.error("[API] /api/personize/sync-contacts failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
