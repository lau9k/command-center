import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createCommunityEventSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import type { CommunityEvent } from "@/lib/types/database";

export const GET = withErrorHandler(withAuth(async function GET(request: NextRequest, _user) {
  const { searchParams } = request.nextUrl;

  const eventType = searchParams.get("event_type") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);

  const supabase = createServiceClient();

  let query = supabase
    .from("community_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (eventType) {
    query = query.eq("event_type", eventType);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const events = (data ?? []) as CommunityEvent[];

  return NextResponse.json({
    data: events,
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
  });
}));

export const POST = withErrorHandler(withAuth(async function POST(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createCommunityEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("community_events")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}));
