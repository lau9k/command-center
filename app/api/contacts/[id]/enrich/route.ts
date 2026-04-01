import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { smartRecall } from "@/lib/personize/actions";
import { createServiceClient } from "@/lib/supabase/service";

const querySchema = z.object({
  q: z.string().min(1).max(500).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get("q") || undefined });
  const query = parsed.success ? parsed.data.q : undefined;

  // For Personize-native contacts (record IDs), use record_id directly
  const isPersonizeId = id.startsWith("REC#") || id.length > 36;

  let contactName = "contact";
  let contactEmail: string | null = null;

  if (!isPersonizeId) {
    const supabase = createServiceClient();
    const { data: contact, error } = await supabase
      .from("contacts")
      .select("email, name, record_id")
      .eq("id", id)
      .single();

    if (error || !contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    contactName = contact.name;
    contactEmail = contact.email;
  }

  try {
    const recallQuery = query ?? contactName;
    const result = await smartRecall(recallQuery, {
      ...(contactEmail ? { email: contactEmail } : {}),
      response_detail: "full",
    });

    const rawRecords = result?.records;
    const records = Array.isArray(rawRecords) ? rawRecords : [];

    // Extract properties from records that have them
    const properties: Record<string, string> = {};
    for (const record of records) {
      if (record.properties) {
        Object.assign(properties, record.properties);
      }
    }

    return NextResponse.json({
      data: {
        recall: {
          query: recallQuery,
          records,
          answer: result?.answer ?? null,
        },
        properties,
      },
    });
  } catch (err) {
    console.error("[API] /api/contacts/[id]/enrich failed:", err);
    return NextResponse.json(
      { error: "Enrichment failed" },
      { status: 500 }
    );
  }
}
