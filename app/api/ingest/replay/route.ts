import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { createServiceClient } from "@/lib/supabase/service";
import type { IngestEventStatus } from "@/lib/types/database";

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.API_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    source?: string;
    limit?: number;
  };

  const limit = body.limit ?? 100;
  const supabase = createServiceClient();

  let query = supabase
    .from("ingest_events")
    .update({
      status: "received" as IngestEventStatus,
      attempt_count: 0,
      next_retry_at: null,
      last_error_code: null,
      updated_at: new Date().toISOString(),
    })
    .eq("status", "dead_letter")
    .limit(limit)
    .select("id");

  if (body.source) {
    query = query.eq("source", body.source);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, replayed: data?.length ?? 0 },
    { status: 200 }
  );
});
