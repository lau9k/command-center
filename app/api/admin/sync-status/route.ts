import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { createServiceClient } from "@/lib/supabase/service";

const TABLES = [
  "contacts",
  "tasks",
  "pipeline_items",
  "content_posts",
  "meetings",
] as const;

type SyncStatus = "pending" | "synced" | "failed" | "skipped";

type TableSyncCounts = Record<SyncStatus, number>;

type SyncStatusResponse = Record<(typeof TABLES)[number], TableSyncCounts>;

const STATUSES: SyncStatus[] = ["pending", "synced", "failed", "skipped"];

const EMPTY_COUNTS: TableSyncCounts = {
  pending: 0,
  synced: 0,
  failed: 0,
  skipped: 0,
};

async function getTableSyncCounts(
  supabase: ReturnType<typeof createServiceClient>,
  table: string
): Promise<TableSyncCounts> {
  // Supabase JS doesn't support GROUP BY, so count each status in parallel
  const counts = await Promise.all(
    STATUSES.map(async (status) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("personize_sync_status", status);

      if (error) {
        throw new Error(
          `Failed to count ${status} in ${table}: ${error.message}`
        );
      }

      return { status, count: count ?? 0 };
    })
  );

  const result = { ...EMPTY_COUNTS };
  for (const { status, count } of counts) {
    result[status] = count;
  }
  return result;
}

export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  const supabase = createServiceClient();

  const results = await Promise.all(
    TABLES.map(async (table) => {
      const counts = await getTableSyncCounts(supabase, table);
      return { table, counts };
    })
  );

  const data = {} as SyncStatusResponse;
  for (const { table, counts } of results) {
    data[table] = counts;
  }

  return NextResponse.json({ data });
}));

export const POST = withErrorHandler(withAuth(async function POST(_request, _user) {
  const supabase = createServiceClient();

  // Retry: set all 'failed' records back to 'pending' across all tables
  const results = await Promise.all(
    TABLES.map(async (table) => {
      const { data: updated, error } = await supabase
        .from(table)
        .update({ personize_sync_status: "pending" })
        .eq("personize_sync_status", "failed")
        .select("id");

      if (error) {
        throw new Error(`Failed to retry ${table}: ${error.message}`);
      }

      return { table, retriedCount: updated?.length ?? 0 };
    })
  );

  const retried = {} as Record<string, number>;
  for (const { table, retriedCount } of results) {
    retried[table] = retriedCount;
  }

  return NextResponse.json({ data: { retried } });
}));
