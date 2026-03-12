import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { z } from "zod";

const syncLogQuerySchema = z.object({
  source: z.string().optional(),
  status: z.enum(["success", "error", "partial", "running"]).optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const params = syncLogQuerySchema.parse(
    Object.fromEntries(searchParams.entries())
  );

  const supabase = createServiceClient();

  let query = supabase
    .from("sync_log")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.source) {
    query = query.eq("source", params.source);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count });
});
