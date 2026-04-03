import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

const TABLE_MAP = {
  contacts: "contacts",
  tasks: "tasks",
  conversations: "conversations",
  transactions: "transactions",
} as const;

type TableKey = keyof typeof TABLE_MAP;

const N8N_SOURCES = [
  "n8n:contacts",
  "n8n:tasks",
  "n8n:conversations",
  "n8n:transactions",
] as const;

export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();
  const now = new Date();
  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString();
  const fiveMinutesAgo = new Date(
    now.getTime() - 5 * 60 * 1000
  ).toISOString();

  // Query actual entity tables for last-ingested timestamps and row counts
  const tableStats = await Promise.all(
    (Object.keys(TABLE_MAP) as TableKey[]).map(async (key) => {
      const table = TABLE_MAP[key];

      const [lastRow, countResult] = await Promise.all([
        supabase
          .from(table)
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from(table)
          .select("*", { count: "exact", head: true }),
      ]);

      return {
        table: key,
        last_ingested_at: lastRow.data?.created_at ?? null,
        row_count: countResult.count ?? 0,
      };
    })
  );

  // Fetch sync_log entries for the last 24h plus latest per source
  const [{ data: syncLogs }, { data: recentSyncLogs }] = await Promise.all([
    supabase
      .from("sync_log")
      .select("source, status, started_at, completed_at, records_synced")
      .order("started_at", { ascending: false }),
    supabase
      .from("sync_log")
      .select("source, status, started_at, completed_at, records_synced")
      .gte("started_at", twentyFourHoursAgo)
      .order("started_at", { ascending: false }),
  ]);

  // Deduplicate to latest per source
  const latestSyncBySource: Record<
    string,
    {
      status: string;
      started_at: string;
      completed_at: string | null;
      records_synced: number | null;
    }
  > = {};
  if (syncLogs) {
    for (const log of syncLogs) {
      if (!latestSyncBySource[log.source]) {
        latestSyncBySource[log.source] = {
          status: log.status,
          started_at: log.started_at,
          completed_at: log.completed_at,
          records_synced: log.records_synced,
        };
      }
    }
  }

  // Compute 24h sync stats per status
  const syncStats24h = {
    success: 0,
    error: 0,
    partial: 0,
    running: 0,
    total: 0,
  };
  const syncDurations: number[] = [];
  let stuckCount = 0;

  if (recentSyncLogs) {
    for (const log of recentSyncLogs) {
      syncStats24h.total++;
      const status = log.status as keyof typeof syncStats24h;
      if (status in syncStats24h) {
        syncStats24h[status]++;
      }

      // Calculate processing duration for completed syncs
      if (log.completed_at && log.started_at) {
        const duration =
          new Date(log.completed_at).getTime() -
          new Date(log.started_at).getTime();
        syncDurations.push(duration);
      }

      // Detect stuck: status is "running" and started > 5 min ago
      if (log.status === "running" && log.started_at < fiveMinutesAgo) {
        stuckCount++;
      }
    }
  }

  const avgProcessingLatencyMs =
    syncDurations.length > 0
      ? Math.round(
          syncDurations.reduce((a, b) => a + b, 0) / syncDurations.length
        )
      : null;

  // Aggregate n8n-specific summary
  const n8n: Record<
    string,
    {
      last_sync_at: string | null;
      status: string | null;
      records_synced: number | null;
    }
  > = {};
  for (const src of N8N_SOURCES) {
    const entry = latestSyncBySource[src];
    n8n[src] = {
      last_sync_at: entry?.completed_at ?? entry?.started_at ?? null,
      status: entry?.status ?? null,
      records_synced: entry?.records_synced ?? null,
    };
  }

  // Fetch last synthetic test result from sync_log
  const { data: lastSynthetic } = await supabase
    .from("sync_log")
    .select("status, started_at, completed_at")
    .eq("source", "synthetic-test")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch recent sync_log entries (last 10) for dashboard display
  const { data: recentEntries } = await supabase
    .from("sync_log")
    .select("source, status, started_at, completed_at, records_synced")
    .order("started_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    success: true,
    data: {
      tables: Object.fromEntries(
        tableStats.map((s) => [
          s.table,
          { last_ingested_at: s.last_ingested_at, row_count: s.row_count },
        ])
      ),
      sync_log: latestSyncBySource,
      n8n,
      pipeline: {
        sync_stats_24h: syncStats24h,
        avg_processing_latency_ms: avgProcessingLatencyMs,
        stuck_events: stuckCount,
        last_synthetic_test: lastSynthetic
          ? {
              result: lastSynthetic.status === "success" ? "pass" : "fail",
              tested_at: lastSynthetic.completed_at ?? lastSynthetic.started_at,
            }
          : null,
        recent_sync_entries: recentEntries ?? [],
      },
      checked_at: now.toISOString(),
    },
  });
});
