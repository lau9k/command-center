import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

const ENTITY_TYPES = ["contact", "task", "conversation", "transaction"] as const;

export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();
  const now = new Date();
  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString();

  // Fetch last successful ingestion per entity type
  const lastIngestions = await Promise.all(
    ENTITY_TYPES.map(async (entityType) => {
      const { data } = await supabase
        .from("activity_log")
        .select("created_at")
        .eq("action", "ingested")
        .eq("entity_type", entityType)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return {
        entity_type: entityType,
        last_ingested_at: data?.created_at ?? null,
      };
    })
  );

  // Count errors in last 24h (activity_log entries with action containing error context)
  const { count: errorCount } = await supabase
    .from("activity_log")
    .select("*", { count: "exact", head: true })
    .eq("action", "ingested")
    .gte("created_at", twentyFourHoursAgo)
    .not("metadata->>error", "is", null);

  return NextResponse.json({
    success: true,
    data: {
      endpoints: Object.fromEntries(
        lastIngestions.map((e) => [e.entity_type, e.last_ingested_at])
      ),
      errors_24h: errorCount ?? 0,
      checked_at: now.toISOString(),
    },
  });
});
