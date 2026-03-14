import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { z } from "zod";

const querySchema = z.object({
  pipeline_id: z.string().uuid().optional(),
});

interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  color: string | null;
}

interface PipelineItem {
  id: string;
  stage_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function parseDealValue(metadata: Record<string, unknown> | null): number {
  if (!metadata) return 0;
  const raw = metadata.deal_value;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const num = parseFloat(raw.replace(/[$,\s]/g, ""));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);

  const parsed = querySchema.safeParse({
    pipeline_id: searchParams.get("pipeline_id") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  let stagesQuery = supabase
    .from("pipeline_stages")
    .select("id, name, slug, sort_order, color")
    .order("sort_order", { ascending: true });

  let itemsQuery = supabase
    .from("pipeline_items")
    .select("id, stage_id, metadata, created_at, updated_at");

  if (parsed.data.pipeline_id) {
    stagesQuery = stagesQuery.eq("pipeline_id", parsed.data.pipeline_id);
    itemsQuery = itemsQuery.eq("pipeline_id", parsed.data.pipeline_id);
  }

  const [stagesResult, itemsResult] = await Promise.all([stagesQuery, itemsQuery]);

  if (stagesResult.error) {
    return NextResponse.json({ error: stagesResult.error.message }, { status: 500 });
  }
  if (itemsResult.error) {
    return NextResponse.json({ error: itemsResult.error.message }, { status: 500 });
  }

  const stages = (stagesResult.data ?? []) as PipelineStage[];
  const items = (itemsResult.data ?? []) as PipelineItem[];

  const itemsByStage = new Map<string, PipelineItem[]>();
  for (const item of items) {
    const existing = itemsByStage.get(item.stage_id) ?? [];
    existing.push(item);
    itemsByStage.set(item.stage_id, existing);
  }

  const now = Date.now();

  // Win/loss identification
  const wonSlugs = new Set(["won", "closed-won"]);
  const lostSlugs = new Set(["lost", "closed-lost"]);
  const wonStageIds = new Set(stages.filter((s) => wonSlugs.has(s.slug)).map((s) => s.id));
  const lostStageIds = new Set(stages.filter((s) => lostSlugs.has(s.slug)).map((s) => s.id));

  const wonItems = items.filter((i) => wonStageIds.has(i.stage_id));
  const lostItems = items.filter((i) => lostStageIds.has(i.stage_id));
  const completedCount = wonItems.length + lostItems.length;
  const winRate = completedCount > 0 ? Math.round((wonItems.length / completedCount) * 100) : 0;

  // Deal velocity: avg days from created_at to updated_at for won deals
  const wonVelocities = wonItems.map((item) => {
    const created = new Date(item.created_at).getTime();
    const updated = new Date(item.updated_at).getTime();
    return (updated - created) / (1000 * 60 * 60 * 24);
  });
  const avgDealVelocity =
    wonVelocities.length > 0
      ? Math.round((wonVelocities.reduce((sum, d) => sum + d, 0) / wonVelocities.length) * 10) / 10
      : 0;

  // Stage-level metrics
  const totalItems = items.length;
  const stageMetrics = stages.map((stage) => {
    const stageItems = itemsByStage.get(stage.id) ?? [];
    const count = stageItems.length;
    const values = stageItems.map((item) => parseDealValue(item.metadata));
    const totalValue = values.reduce((sum, v) => sum + v, 0);
    const avgValue = count > 0 ? Math.round(totalValue / count) : 0;

    const days = stageItems.map((item) => {
      const created = new Date(item.created_at).getTime();
      return (now - created) / (1000 * 60 * 60 * 24);
    });
    const avgDays =
      count > 0
        ? Math.round((days.reduce((sum, d) => sum + d, 0) / count) * 10) / 10
        : 0;

    const conversionRate = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;

    return {
      stage_id: stage.id,
      stage_name: stage.name,
      stage_slug: stage.slug,
      color: stage.color,
      sort_order: stage.sort_order,
      count,
      total_value: totalValue,
      avg_value: avgValue,
      avg_days: avgDays,
      conversion_rate: conversionRate,
    };
  });

  return NextResponse.json({
    avg_deal_velocity: avgDealVelocity,
    win_rate: winRate,
    won_count: wonItems.length,
    lost_count: lostItems.length,
    won_value: wonItems.reduce((sum, i) => sum + parseDealValue(i.metadata), 0),
    lost_value: lostItems.reduce((sum, i) => sum + parseDealValue(i.metadata), 0),
    total_deals: totalItems,
    total_value: items.reduce((sum, i) => sum + parseDealValue(i.metadata), 0),
    stage_metrics: stageMetrics,
  });
});
