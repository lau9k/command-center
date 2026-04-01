import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import client from "@/lib/personize/client";
import {
  getCachedContext,
  setCachedContext,
  isCacheFresh,
  computeInputHash,
} from "@/lib/ai/cache";

const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
const VIEW_TYPE = "enrichment_stats";
const MODEL_MODE = "fast";
const CACHE_TTL_MINUTES = 60;

const CONTACTS_COLLECTION_ID =
  process.env.PERSONIZE_CONTACTS_COLLECTION_ID ??
  "8ef5a304-05b0-4f06-9660-fb948b9fa5d9";

export interface EnrichmentStats {
  total: number;
  has_email: number;
  has_linkedin: number;
  has_gmail: number;
  has_apollo: number;
  generated_at: string;
}

async function computeEnrichmentStats(): Promise<EnrichmentStats> {
  const rawRecords: Array<Record<string, string>> = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await client.memory.search({
      type: "Contact",
      collectionIds: [CONTACTS_COLLECTION_ID],
      returnRecords: true,
      pageSize,
      page,
    });

    const data = response.data as {
      records?: Array<{ properties?: Record<string, string> }>;
      total?: number;
    } | null;

    const records = Array.isArray(data?.records) ? data.records : [];
    for (const r of records) {
      if (r.properties) rawRecords.push(r.properties);
    }

    const total = data?.total ?? 0;
    hasMore = page * pageSize < total;
    page++;

    if (page > 100) break;
  }

  let hasEmail = 0;
  let hasLinkedin = 0;
  let hasGmail = 0;
  let hasApollo = 0;

  for (const props of rawRecords) {
    if (props.email && props.email.trim() !== "") hasEmail++;
    if (props.linkedin_url && props.linkedin_url.trim() !== "") hasLinkedin++;
    if (
      props.gmail_context_stored === "true" ||
      props.gmail_context_stored === "True"
    )
      hasGmail++;
    if (props.apollo_enriched === "true" || props.apollo_enriched === "True")
      hasApollo++;
  }

  return {
    total: rawRecords.length,
    has_email: hasEmail,
    has_linkedin: hasLinkedin,
    has_gmail: hasGmail,
    has_apollo: hasApollo,
    generated_at: new Date().toISOString(),
  };
}

export const GET = withErrorHandler(async function GET() {
  const inputHash = computeInputHash("enrichment-stats", "v1");

  // Check cache first
  const cached = await getCachedContext(
    SYSTEM_USER_ID,
    VIEW_TYPE,
    null,
    MODEL_MODE
  );

  if (cached && isCacheFresh(cached) && cached.input_hash === inputHash) {
    return NextResponse.json({ data: cached.content as unknown as EnrichmentStats });
  }

  // Compute fresh stats
  try {
    const stats = await computeEnrichmentStats();

    // Cache the result
    await setCachedContext(
      SYSTEM_USER_ID,
      VIEW_TYPE,
      null,
      MODEL_MODE,
      inputHash,
      stats as unknown as Record<string, unknown>,
      0,
      CACHE_TTL_MINUTES
    );

    return NextResponse.json({ data: stats });
  } catch (error) {
    // If Personize is unavailable, return fallback
    console.error("[EnrichmentStats] Failed to compute stats:", error);

    // Try to return stale cache if available
    if (cached) {
      return NextResponse.json({
        data: cached.content as unknown as EnrichmentStats,
        stale: true,
      });
    }

    return NextResponse.json({
      data: {
        total: 0,
        has_email: 0,
        has_linkedin: 0,
        has_gmail: 0,
        has_apollo: 0,
        generated_at: new Date().toISOString(),
      } satisfies EnrichmentStats,
      unavailable: true,
    });
  }
});
