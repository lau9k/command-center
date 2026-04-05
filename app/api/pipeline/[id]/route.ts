import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updatePipelineItemSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { uuidParam } from "@/lib/validations";
import { invalidate } from "@/lib/cache/redis";

export const PATCH = withErrorHandler(async function PATCH(
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  if (!id || !uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updatePipelineItemSchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id: _id, ...updates } = parsed.data;

  const { data, error } = await supabase
    .from("pipeline_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  // Invalidate home dashboard cache so pipeline KPIs reflect immediately
  void invalidate("home:dashboard:summary").catch(() => {});

  return NextResponse.json(data);
});

export const DELETE = withErrorHandler(async function DELETE(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  if (!id || !uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("pipeline_items")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalidate home dashboard cache so pipeline KPIs reflect immediately
  void invalidate("home:dashboard:summary").catch(() => {});

  return NextResponse.json({ success: true });
});
