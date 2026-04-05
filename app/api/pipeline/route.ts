import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createPipelineItemSchema, updatePipelineItemSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { syncDealToPersonize } from "@/lib/personize/sync";
import { invalidate } from "@/lib/cache/redis";

export const GET = withErrorHandler(withAuth(async function GET(request, _user) {
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
}));

export const POST = withErrorHandler(withAuth(async function POST(request, _user) {
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

  // Invalidate home dashboard cache so pipeline KPIs reflect immediately
  void invalidate("home:dashboard:summary").catch(() => {});

  return NextResponse.json(data, { status: 201 });
}));

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
  const isStageChange = updates.stage_id !== undefined;

  // Set sync status to pending before the update if stage is changing
  const updatePayload = {
    ...updates,
    updated_at: new Date().toISOString(),
    ...(isStageChange ? { personize_sync_status: "pending" as const } : {}),
  };

  const { data, error } = await supabase
    .from("pipeline_items")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget: sync deal context to Personize on stage change
  if (isStageChange && data) {
    const item = data as Record<string, unknown>;
    const metadata = (item.metadata ?? {}) as Record<string, unknown>;

    // Fetch stage name for the new stage
    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("name")
      .eq("id", updates.stage_id!)
      .single();

    syncDealToPersonize({
      company_name: (metadata.company_name as string) ?? (item.title as string) ?? "",
      amount: (metadata.amount as number) ?? null,
      stage_name: stage?.name ?? "",
      notes: (metadata.notes as string) ?? null,
      contact_email: (metadata.contact_email as string) ?? null,
    }).then((synced) => {
      if (synced) {
        supabase
          .from("pipeline_items")
          .update({
            personize_sync_status: "synced",
            personize_synced_at: new Date().toISOString(),
          })
          .eq("id", id)
          .then(({ error: syncUpdateError }) => {
            if (syncUpdateError) {
              console.error("[Pipeline] Failed to update sync status:", syncUpdateError);
            }
          });
      } else {
        supabase
          .from("pipeline_items")
          .update({ personize_sync_status: "failed" })
          .eq("id", id)
          .then(({ error: syncUpdateError }) => {
            if (syncUpdateError) {
              console.error("[Pipeline] Failed to update sync status:", syncUpdateError);
            }
          });
      }
    });
  }

  // Invalidate home dashboard cache so pipeline KPIs reflect immediately
  void invalidate("home:dashboard:summary").catch(() => {});

  return NextResponse.json(data);
});
