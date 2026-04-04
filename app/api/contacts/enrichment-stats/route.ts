import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import client from "@/lib/personize/client";
import { createServiceClient } from "@/lib/supabase/service";

const CONTACTS_COLLECTION_ID =
  process.env.PERSONIZE_CONTACTS_COLLECTION_ID ??
  "5686312a-7ab7-4cef-897c-576bfeb92aec";

const PERSONIZE_API_BASE = "https://agent.personize.ai";
const PERSONIZE_API_KEY = process.env.PERSONIZE_SECRET_KEY ?? "";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Legacy enrichment breakdown (used by EnrichmentCoverageCard) */
export interface EnrichmentStats {
  total: number;
  has_email: number;
  has_linkedin: number;
  has_gmail: number;
  has_apollo: number;
  generated_at: string;
}

/** KPI response shape for contacts page */
export interface EnrichmentKpis {
  totalContacts: number;
  withMemories: number;
  withProperties: number;
  taggedThisWeek: number;
  untagged: number;
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Simple in-memory cache (same pattern as actions.ts)
// ---------------------------------------------------------------------------

interface CachedResponse {
  data: EnrichmentStats;
  kpis: EnrichmentKpis;
  expiresAt: number;
}

let cached: CachedResponse | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchPropertyCount(
  propertyName: string,
  limit = 1
): Promise<number> {
  try {
    const response = await fetch(
      `${PERSONIZE_API_BASE}/api/v1/memory/filter-by-property`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PERSONIZE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collectionId: CONTACTS_COLLECTION_ID,
          conditions: [{ propertyName, operator: "exists" }],
          limit,
        }),
      }
    );
    if (!response.ok) return 0;
    const data = (await response.json()) as {
      data?: { total?: number; records?: unknown[] };
    };
    return data?.data?.total ?? data?.data?.records?.length ?? 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const GET = withErrorHandler(async function GET() {
  // Return cached data if fresh
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json({ data: cached.data, kpis: cached.kpis });
  }

  // 1. Get total contacts from Personize (pageSize: 1 to read total without pulling all records)
  const searchResponse = await client.memory.search({
    collectionIds: [CONTACTS_COLLECTION_ID],
    pageSize: 1,
    page: 1,
  });

  const searchData = (searchResponse?.data ?? searchResponse) as {
    totalMatched?: number;
  };
  const totalContacts = searchData?.totalMatched ?? 0;

  // 2. Query Supabase memory_stats for contacts with memories
  const supabase = createServiceClient();
  const { count: withMemories } = await supabase
    .from("memory_stats")
    .select("id", { count: "exact", head: true })
    .gt("count", 0);

  // 3. Fetch property counts + tag analytics in parallel
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    hasEmail,
    hasLinkedin,
    hasGmail,
    hasApollo,
    { count: taggedThisWeekCount },
    { count: untaggedCount },
  ] = await Promise.all([
    fetchPropertyCount("email"),
    fetchPropertyCount("linkedin_url"),
    fetchPropertyCount("gmail_context_stored"),
    fetchPropertyCount("apollo_enriched"),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .not("tags", "is", null)
      .neq("tags", "{}")
      .gt("updated_at", sevenDaysAgo),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .or("tags.is.null,tags.eq.{}"),
  ]);

  const now = new Date().toISOString();

  // Legacy enrichment breakdown (EnrichmentCoverageCard)
  const data: EnrichmentStats = {
    total: totalContacts,
    has_email: hasEmail,
    has_linkedin: hasLinkedin,
    has_gmail: hasGmail,
    has_apollo: hasApollo,
    generated_at: now,
  };

  // KPI shape for contacts page
  const kpis: EnrichmentKpis = {
    totalContacts,
    withMemories: withMemories ?? 0,
    withProperties: hasEmail, // contacts with email = primary enrichment signal
    taggedThisWeek: taggedThisWeekCount ?? 0,
    untagged: untaggedCount ?? 0,
    lastUpdated: now,
  };

  // Cache the result
  cached = { data, kpis, expiresAt: Date.now() + CACHE_TTL_MS };

  return NextResponse.json({ data, kpis });
});
