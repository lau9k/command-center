import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { smartRecall } from "@/lib/personize/actions";
import { createServiceClient } from "@/lib/supabase/service";
import { isPersonizeId } from "@/lib/personize/id-guard";
import { cached, invalidate } from "@/lib/cache/redis";
import type { SmartRecallRecord } from "@/lib/personize/types";

const ENRICH_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface EnrichmentResult {
  recall: {
    query: string;
    records: SmartRecallRecord[];
    answer: string | null;
  };
  properties: Record<string, string>;
}

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
  const refresh = searchParams.get("refresh") === "true";

  if (isPersonizeId(id)) {
    return NextResponse.json({
      data: {
        recall: { query: null, records: [], answer: null },
        properties: {},
      },
    });
  }

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

  const contactName = contact.name;
  const contactEmail = contact.email;

  try {
    const recallQuery = query ?? contactName;

    // Custom queries bypass cache — only cache default enrichment
    if (query) {
      const result = await smartRecall(recallQuery, {
        ...(contactEmail ? { email: contactEmail } : {}),
        responseDetail: "full",
      });
      return NextResponse.json({ data: buildEnrichmentData(recallQuery, result) });
    }

    const cacheKey = `enrich:${id}`;

    // Force refresh: invalidate before the cached() call
    if (refresh) {
      await invalidate(cacheKey);
    }

    const data = await cached<EnrichmentResult>(
      cacheKey,
      async () => {
        const result = await smartRecall(recallQuery, {
          ...(contactEmail ? { email: contactEmail } : {}),
          responseDetail: "full",
        });
        return buildEnrichmentData(recallQuery, result);
      },
      { ttlMs: ENRICH_TTL_MS },
    );

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[API] /api/contacts/[id]/enrich failed:", err);
    return NextResponse.json(
      { error: "Enrichment failed" },
      { status: 500 }
    );
  }
}

function buildEnrichmentData(
  recallQuery: string,
  result: { records?: SmartRecallRecord[]; answer?: string } | null,
): EnrichmentResult {
  const rawRecords = result?.records;
  const records = Array.isArray(rawRecords) ? rawRecords : [];

  const properties: Record<string, string> = {};
  for (const record of records) {
    if (record.properties) {
      Object.assign(properties, record.properties);
    }
  }

  return {
    recall: {
      query: recallQuery,
      records,
      answer: result?.answer ?? null,
    },
    properties,
  };
}
