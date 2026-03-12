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

interface StageConversion {
  stage_id: string;
  stage_name: string;
  stage_slug: string;
  color: string | null;
  sort_order: number;
  count: number;
  value: number;
  conversion_rate: number;
}

interface StageDuration {
  stage_id: string;
  stage_name: string;
  stage_slug: string;
  color: string | null;
  avg_days: number;
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

  // Group items by stage_id
  const itemsByStage = new Map<string, PipelineItem[]>();
  for (const item of items) {
    const existing = itemsByStage.get(item.stage_id) ?? [];
    existing.push(item);
    itemsByStage.set(item.stage_id, existing);
  }

  // Conversion funnel: count + value per stage, conversion rate relative to first stage
  const totalItems = items.length;
  const funnel: StageConversion[] = stages.map((stage) => {
    const stageItems = itemsByStage.get(stage.id) ?? [];
    const count = stageItems.length;
    const value = stageItems.reduce((sum, item) => sum + parseDealValue(item.metadata), 0);
    return {
      stage_id: stage.id,
      stage_name: stage.name,
      stage_slug: stage.slug,
      color: stage.color,
      sort_order: stage.sort_order,
      count,
      value,
      conversion_rate: totalItems > 0 ? Math.round((count / totalItems) * 100) : 0,
    };
  });

  // Win/loss stats
  const wonSlugs = new Set(["won", "closed-won"]);
  const lostSlugs = new Set(["lost", "closed-lost"]);
  const wonStageIds = new Set(stages.filter((s) => wonSlugs.has(s.slug)).map((s) => s.id));
  const lostStageIds = new Set(stages.filter((s) => lostSlugs.has(s.slug)).map((s) => s.id));

  const wonItems = items.filter((i) => wonStageIds.has(i.stage_id));
  const lostItems = items.filter((i) => lostStageIds.has(i.stage_id));
  const completedCount = wonItems.length + lostItems.length;

  const winLoss = {
    won: wonItems.length,
    lost: lostItems.length,
    win_rate: completedCount > 0 ? Math.round((wonItems.length / completedCount) * 100) : 0,
    won_value: wonItems.reduce((sum, i) => sum + parseDealValue(i.metadata), 0),
    lost_value: lostItems.reduce((sum, i) => sum + parseDealValue(i.metadata), 0),
  };

  // Stage durations: average days items have spent in each stage
  // Approximation using (updated_at - created_at) for items currently in each stage
  const stageDurations: StageDuration[] = stages.map((stage) => {
    const stageItems = itemsByStage.get(stage.id) ?? [];
    if (stageItems.length === 0) {
      return {
        stage_id: stage.id,
        stage_name: stage.name,
        stage_slug: stage.slug,
        color: stage.color,
        avg_days: 0,
      };
    }

    const now = Date.now();
    const totalDays = stageItems.reduce((sum, item) => {
      const created = new Date(item.created_at).getTime();
      const diffMs = now - created;
      return sum + diffMs / (1000 * 60 * 60 * 24);
    }, 0);

    return {
      stage_id: stage.id,
      stage_name: stage.name,
      stage_slug: stage.slug,
      color: stage.color,
      avg_days: Math.round((totalDays / stageItems.length) * 10) / 10,
    };
  });

  return NextResponse.json({
    funnel,
    win_loss: winLoss,
    stage_durations: stageDurations,
    total_deals: totalItems,
    total_value: items.reduce((sum, i) => sum + parseDealValue(i.metadata), 0),
  });
});
