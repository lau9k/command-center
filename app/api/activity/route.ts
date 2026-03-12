import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { z } from "zod";

const activityQuerySchema = z.object({
  entity_type: z.string().optional(),
  source: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const createActivitySchema = z.object({
  action: z.enum(["created", "updated", "deleted", "ingested", "synced"]),
  entity_type: z.enum(["contact", "task", "conversation", "sponsor", "transaction", "content_post"]),
  entity_id: z.string().uuid().optional(),
  entity_name: z.string().optional(),
  source: z.enum(["manual", "webhook", "n8n", "granola", "plaid", "personize"]).default("manual"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const params = activityQuerySchema.parse(Object.fromEntries(searchParams.entries()));

  const supabase = createServiceClient();

  let query = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.entity_type) {
    query = query.eq("entity_type", params.entity_type);
  }
  if (params.source) {
    query = query.eq("source", params.source);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createActivitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("activity_log")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
});
