import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createPipelineItemSchema, updatePipelineItemSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const pipelineId = searchParams.get("pipeline_id");

  let stagesQuery = supabase
    .from("pipeline_stages")
    .select("id, name, slug, sort_order, color, pipeline_id, project_id")
    .order("sort_order", { ascending: true });

  let itemsQuery = supabase
    .from("pipeline_items")
    .select(
      "id, pipeline_id, stage_id, project_id, title, entity_type, metadata, sort_order, created_at, updated_at"
    )
    .order("sort_order", { ascending: true });

  if (pipelineId) {
    stagesQuery = stagesQuery.eq("pipeline_id", pipelineId);
    itemsQuery = itemsQuery.eq("pipeline_id", pipelineId);
  }

  const [stagesResult, itemsResult] = await Promise.all([
    stagesQuery,
    itemsQuery,
  ]);

  if (stagesResult.error) {
    return NextResponse.json(
      { error: stagesResult.error.message },
      { status: 500 }
    );
  }

  if (itemsResult.error) {
    return NextResponse.json(
      { error: itemsResult.error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    stages: stagesResult.data ?? [],
    items: itemsResult.data ?? [],
  });
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createPipelineItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("pipeline_items")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
});

export const PATCH = withErrorHandler(async function PATCH(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updatePipelineItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id, ...updates } = parsed.data;

  const { data, error } = await supabase
    .from("pipeline_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
});
