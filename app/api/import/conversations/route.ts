import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

interface ConversationRow {
  Summary?: string;
  Channel?: string;
  Direction?: string;
  Message?: string;
  Date?: string;
  Status?: string;
  Contact?: string;
  [key: string]: string | undefined;
}

function parseDate(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      rows: ConversationRow[];
      project_id: string;
      user_id: string;
    };

    if (!body.rows || !Array.isArray(body.rows)) {
      return NextResponse.json(
        { error: "rows array is required" },
        { status: 400 }
      );
    }

    if (!body.project_id || !body.user_id) {
      return NextResponse.json(
        { error: "project_id and user_id are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Load all contacts for fuzzy name matching
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, name")
      .eq("project_id", body.project_id);

    // Build lowercase name → id lookup for fuzzy matching
    const contactLookup = new Map<string, string>();
    if (contacts) {
      for (const c of contacts) {
        contactLookup.set(c.name.toLowerCase().trim(), c.id);
      }
    }

    function findContactId(name: string | undefined): string | null {
      if (!name?.trim()) return null;
      const lower = name.trim().toLowerCase();

      // Exact match
      if (contactLookup.has(lower)) return contactLookup.get(lower)!;

      // Partial match — contact name contains search or search contains contact name
      for (const [contactName, id] of contactLookup) {
        if (contactName.includes(lower) || lower.includes(contactName)) {
          return id;
        }
      }

      return null;
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i];
      try {
        const summary = row.Summary?.trim();
        if (!summary) {
          skipped++;
          continue;
        }

        const metadata: Record<string, unknown> = {};
        if (row.Direction?.trim()) metadata.direction = row.Direction.trim();
        if (row.Message?.trim()) metadata.last_message = row.Message.trim();
        if (row.Status?.trim()) metadata.status = row.Status.trim();

        const contactId = findContactId(row.Contact);

        const { error } = await supabase.from("conversations").insert({
          project_id: body.project_id,
          user_id: body.user_id,
          contact_id: contactId,
          summary,
          channel: row.Channel?.trim()?.toLowerCase() || null,
          last_message_at: parseDate(row.Date),
          metadata,
        });

        if (error) throw new Error(error.message);
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${i + 1}: ${msg}`);
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
