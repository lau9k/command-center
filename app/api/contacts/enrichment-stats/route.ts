import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { createServiceClient } from "@/lib/supabase/service";

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
  withConversations: number;
  withProperties: number;
  taggedThisWeek: number;
  untagged: number;
  lastUpdated: string;
}

// ---------------------------------------------------------------------------
// Simple in-memory cache
// ---------------------------------------------------------------------------

interface CachedResponse {
  data: EnrichmentStats;
  kpis: EnrichmentKpis;
  expiresAt: number;
}

let cached: CachedResponse | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Route handler — Supabase-primary (no Personize read queries)
// ---------------------------------------------------------------------------

export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  // Return cached data if fresh
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json({ data: cached.data, kpis: cached.kpis });
  }

  const supabase = createServiceClient();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Run all counts in parallel — Supabase only
  const [
    { count: totalContacts },
    { count: withMemories },
    { count: withConversations },
    { count: hasEmail },
    { count: hasLinkedin },
    { count: taggedThisWeekCount },
    { count: untaggedCount },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("memory_stats")
      .select("id", { count: "exact", head: true })
      .gt("count", 0),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("has_conversation", true),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .not("email", "is", null)
      .neq("email", ""),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .not("linkedin_url", "is", null)
      .neq("linkedin_url", ""),
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
  const total = totalContacts ?? 0;

  // Legacy enrichment breakdown (EnrichmentCoverageCard)
  const data: EnrichmentStats = {
    total,
    has_email: hasEmail ?? 0,
    has_linkedin: hasLinkedin ?? 0,
    has_gmail: 0, // Gmail sync count not tracked in Supabase yet
    has_apollo: 0, // Apollo enrichment count not tracked in Supabase yet
    generated_at: now,
  };

  // KPI shape for contacts page
  const kpis: EnrichmentKpis = {
    totalContacts: total,
    withMemories: withMemories ?? 0,
    withConversations: withConversations ?? 0,
    withProperties: hasEmail ?? 0,
    taggedThisWeek: taggedThisWeekCount ?? 0,
    untagged: untaggedCount ?? 0,
    lastUpdated: now,
  };

  // Cache the result
  cached = { data, kpis, expiresAt: Date.now() + CACHE_TTL_MS };

  return NextResponse.json({ data, kpis });
}));
