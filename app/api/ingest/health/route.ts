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
    .select("source, status, started_at, completed_at")
    .order("started_at", { ascending: false });

  // Deduplicate to latest per source
  const latestSyncBySource: Record<
    string,
    { status: string; started_at: string; completed_at: string | null }
  > = {};
  if (syncLogs) {
    for (const log of syncLogs) {
      if (!latestSyncBySource[log.source]) {
        latestSyncBySource[log.source] = {
          status: log.status,
          started_at: log.started_at,
          completed_at: log.completed_at,
        };
      }
    }
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
      checked_at: now.toISOString(),
    },
  });
});
