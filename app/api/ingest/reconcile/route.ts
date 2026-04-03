import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const STALE_THRESHOLD_MINUTES = 5;

export const GET = withRateLimit(withErrorHandler(async function GET(request: NextRequest) {
  const authError = validateWebhookSecret(request);
  if (authError) return authError;

  const supabase = createServiceClient();
  const now = new Date();

  // Events stuck in received/processing for longer than the threshold
  const staleThreshold = new Date(
    now.getTime() - STALE_THRESHOLD_MINUTES * 60 * 1000
  ).toISOString();

  const { data: stuckEvents, error: stuckError } = await supabase
    .from("ingest_events")
    .select("id, source, entity_type, idempotency_key, status, received_at, n8n_execution_id")
    .in("status", ["received", "processing"])
    .lt("received_at", staleThreshold)
    .order("received_at", { ascending: true })
    .limit(100);

  if (stuckError) {
    return NextResponse.json(
      { success: false, error: stuckError.message },
      { status: 500 }
    );
  }

  // Count of events by status per source for the last 24h
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: statusCounts, error: countsError } = await supabase
    .from("ingest_events")
    .select("source, status")
    .gte("received_at", last24h);

  if (countsError) {
    return NextResponse.json(
      { success: false, error: countsError.message },
      { status: 500 }
    );
  }

  // Aggregate counts in-memory
  const counts: Record<string, Record<string, number>> = {};
  for (const row of statusCounts ?? []) {
    const src = row.source as string;
    const st = row.status as string;
    if (!counts[src]) counts[src] = {};
    counts[src][st] = (counts[src][st] ?? 0) + 1;
  }

  return NextResponse.json({
    success: true,
    stuck_events: stuckEvents ?? [],
    stuck_count: stuckEvents?.length ?? 0,
    status_counts_24h: counts,
    checked_at: now.toISOString(),
  });
}), RATE_LIMITS.ingest);
