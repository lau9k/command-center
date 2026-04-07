import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

const querySchema = z.object({
  source: z.string().optional(),
  status: z.enum(["success", "error", "pending", "all"]).optional().default("all"),
  event_type: z.string().optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const GET = withErrorHandler(withAuth(async function GET(request, _user) {
  const { searchParams } = request.nextUrl;

  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { source, status, event_type, from, to, limit, offset } = parsed.data;
  const supabase = createServiceClient();

  let query = supabase
    .from("webhook_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (source) {
    query = query.eq("source", source);
  }

  if (event_type) {
    query = query.eq("event_type", event_type);
  }

  if (status === "success") {
    query = query.gte("status_code", 200).lt("status_code", 300);
  } else if (status === "error") {
    query = query.or("status_code.lt.200,status_code.gte.300");
  } else if (status === "pending") {
    query = query.eq("processed", false);
  }

  if (from) {
    query = query.gte("created_at", from);
  }
  if (to) {
    query = query.lte("created_at", to);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count });
}));
