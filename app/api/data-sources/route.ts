import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

interface DataSourceHealth {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "error";
  lastSync: string | null;
  recordCount: number;
}

const DATA_SOURCES = [
  { id: "gmail", name: "Gmail", table: "gmail_messages", dateCol: "date" },
  { id: "granola", name: "Granola", table: "meetings", dateCol: "date" },
  { id: "linkedin", name: "LinkedIn", table: "contacts", dateCol: "created_at", filter: { column: "source", value: "linkedin" } },
  { id: "plaid", name: "Plaid", table: "invoices", dateCol: "created_at" },
  { id: "personize", name: "Personize", table: "contacts", dateCol: "created_at", filter: { column: "source", value: "personize" } },
  { id: "n8n", name: "n8n", table: "sync_log", dateCol: "synced_at", filter: { column: "source", value: "n8n" } },
] as const;

export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();

  const results: DataSourceHealth[] = await Promise.all(
    DATA_SOURCES.map(async (ds) => {
      try {
        // Get latest record timestamp
        let query = supabase
          .from(ds.table)
          .select("*", { count: "exact", head: false })
          .order(ds.dateCol, { ascending: false })
          .limit(1);

        if ("filter" in ds && ds.filter) {
          query = query.eq(ds.filter.column, ds.filter.value);
        }

        const { data, count, error } = await query;

        if (error) {
          return {
            id: ds.id,
            name: ds.name,
            status: "error" as const,
            lastSync: null,
            recordCount: 0,
          };
        }

        const lastSync = data?.[0]?.[ds.dateCol] ?? null;
        const recordCount = count ?? 0;

        return {
          id: ds.id,
          name: ds.name,
          status: recordCount > 0 ? ("connected" as const) : ("disconnected" as const),
          lastSync,
          recordCount,
        };
      } catch {
        return {
          id: ds.id,
          name: ds.name,
          status: "error" as const,
          lastSync: null,
          recordCount: 0,
        };
      }
    })
  );

  return NextResponse.json({ data: results });
});
