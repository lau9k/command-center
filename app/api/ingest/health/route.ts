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

  // Fetch last sync_log entry per source
  const { data: syncLogs } = await supabase
    .from("sync_log")
    .select("source, status, started_at, completed_at, records_synced")
    .order("started_at", { ascending: false });

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
      checked_at: now.toISOString(),
    },
  });
});
