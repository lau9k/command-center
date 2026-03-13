import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

type PeriodDays = 7 | 30 | 90;

const VALID_PERIODS: Record<string, PeriodDays> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function getStartDate(days: PeriodDays): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function weekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function groupByWeek<T>(
  rows: T[],
  dateField: keyof T
): { week: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = weekKey(String(row[dateField]));
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));
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
  const periodParam = searchParams.get("period") || "30d";
  const days = VALID_PERIODS[periodParam] ?? 30;
  const startDate = getStartDate(days);

  // --- Existing breakdown queries ---

  // Sponsors by tier
  let sponsorsByTier: { tier: string; count: number }[] = [];
  try {
    const { data } = await supabase.from("sponsors").select("tier");
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.tier] = (counts[row.tier] || 0) + 1;
      }
      sponsorsByTier = Object.entries(counts).map(([tier, count]) => ({
        tier,
        count,
      }));
    }
  } catch {
    sponsorsByTier = [];
  }

  // Sponsors by status
  let sponsorsByStatus: { status: string; count: number }[] = [];
  try {
    const { data } = await supabase.from("sponsors").select("status");
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.status] = (counts[row.status] || 0) + 1;
      }
      sponsorsByStatus = Object.entries(counts).map(([status, count]) => ({
        status,
        count,
      }));
    }
  } catch {
    sponsorsByStatus = [];
  }

  // Content by platform
  let contentByPlatform: { platform: string; count: number }[] = [];
  try {
    const { data } = await supabase.from("content_posts").select("platform");
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        const platform = row.platform || "unknown";
        counts[platform] = (counts[platform] || 0) + 1;
      }
      contentByPlatform = Object.entries(counts).map(([platform, count]) => ({
        platform,
        count,
      }));
    }
  } catch {
    contentByPlatform = [];
  }

  // Tasks by status
  let tasksByStatus: { status: string; count: number }[] = [];
  try {
    const { data } = await supabase.from("tasks").select("status");
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        counts[row.status] = (counts[row.status] || 0) + 1;
      }
      tasksByStatus = Object.entries(counts).map(([status, count]) => ({
        status,
        count,
      }));
    }
  } catch {
    tasksByStatus = [];
  }

  // Tasks by project
  let tasksByProject: { project: string; count: number }[] = [];
  try {
    const { data } = await supabase
      .from("tasks")
      .select("project_id, projects(name)");
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        const project =
          (row.projects as unknown as { name: string })?.name ||
          "Unassigned";
        counts[project] = (counts[project] || 0) + 1;
      }
      tasksByProject = Object.entries(counts).map(([project, count]) => ({
        project,
        count,
      }));
    }
  } catch {
    tasksByProject = [];
  }

  // --- Time-series trend queries ---

  // Pipeline value by week
  let pipelineByWeek: { week: string; count: number; value: number }[] = [];
  try {
    const { data } = await supabase
      .from("pipeline_items")
      .select("created_at, metadata")
      .gte("created_at", startDate);
    if (data) {
      const buckets: Record<string, { count: number; value: number }> = {};
      for (const row of data) {
        const key = weekKey(row.created_at);
        if (!buckets[key]) buckets[key] = { count: 0, value: 0 };
        buckets[key].count += 1;
        buckets[key].value += parseDealValue(
          row.metadata as Record<string, unknown> | null
        );
      }
      pipelineByWeek = Object.entries(buckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([week, b]) => ({ week, count: b.count, value: b.value }));
    }
  } catch {
    pipelineByWeek = [];
  }

  // Tasks completed by week
  let tasksCompletedByWeek: { week: string; count: number }[] = [];
  try {
    const { data } = await supabase
      .from("tasks")
      .select("updated_at")
      .eq("status", "done")
      .gte("updated_at", startDate);
    if (data) {
      tasksCompletedByWeek = groupByWeek(data, "updated_at");
    }
  } catch {
    tasksCompletedByWeek = [];
  }

  // Content published by week
  let contentByWeek: { week: string; count: number }[] = [];
  try {
    const { data } = await supabase
      .from("content_posts")
      .select("created_at")
      .gte("created_at", startDate);
    if (data) {
      contentByWeek = groupByWeek(data, "created_at");
    }
  } catch {
    contentByWeek = [];
  }

  // New contacts by week
  let contactsByWeek: { week: string; count: number }[] = [];
  try {
    const { data } = await supabase
      .from("contacts")
      .select("created_at")
      .gte("created_at", startDate);
    if (data) {
      contactsByWeek = groupByWeek(data, "created_at");
    }
  } catch {
    contactsByWeek = [];
  }

  // --- Pipeline funnel (all-time) ---
  let pipelineFunnel: {
    stage_name: string;
    count: number;
    value: number;
    conversion_rate: number;
  }[] = [];
  try {
    const [stagesResult, itemsResult] = await Promise.all([
      supabase
        .from("pipeline_stages")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("pipeline_items")
        .select("stage_id, metadata"),
    ]);
    const stages = stagesResult.data ?? [];
    const items = itemsResult.data ?? [];
    const totalItems = items.length;

    const itemsByStage = new Map<
      string,
      { count: number; value: number }
    >();
    for (const item of items) {
      const existing = itemsByStage.get(item.stage_id) ?? {
        count: 0,
        value: 0,
      };
      existing.count += 1;
      existing.value += parseDealValue(
        item.metadata as Record<string, unknown> | null
      );
      itemsByStage.set(item.stage_id, existing);
    }

    pipelineFunnel = stages.map((stage) => {
      const bucket = itemsByStage.get(stage.id) ?? { count: 0, value: 0 };
      return {
        stage_name: stage.name,
        count: bucket.count,
        value: bucket.value,
        conversion_rate:
          totalItems > 0
            ? Math.round((bucket.count / totalItems) * 100)
            : 0,
      };
    });
  } catch {
    pipelineFunnel = [];
  }

  // --- KPI summary ---
  let kpi = {
    totalDeals: 0,
    winRate: 0,
    avgDealSize: 0,
    tasksPerWeek: 0,
    contentPerWeek: 0,
  };
  try {
    const [pipelineResult, wonItemsResult, completedItemsResult] =
      await Promise.all([
        supabase
          .from("pipeline_items")
          .select("id, stage_id, metadata"),
        supabase
          .from("pipeline_stages")
          .select("id, slug")
          .in("slug", ["won", "closed-won"]),
        supabase
          .from("pipeline_stages")
          .select("id, slug")
          .in("slug", ["won", "closed-won", "lost", "closed-lost"]),
      ]);

    const allItems = pipelineResult.data ?? [];
    const wonStageIds = new Set(
      (wonItemsResult.data ?? []).map((s) => s.id)
    );
    const completedStageIds = new Set(
      (completedItemsResult.data ?? []).map((s) => s.id)
    );

    const totalDeals = allItems.length;
    const wonItems = allItems.filter((i) => wonStageIds.has(i.stage_id));
    const completedItems = allItems.filter((i) =>
      completedStageIds.has(i.stage_id)
    );
    const totalValue = allItems.reduce(
      (sum, i) =>
        sum +
        parseDealValue(i.metadata as Record<string, unknown> | null),
      0
    );

    const weeks = Math.max(days / 7, 1);
    const totalTasksDone = tasksCompletedByWeek.reduce(
      (s, w) => s + w.count,
      0
    );
    const totalContent = contentByWeek.reduce((s, w) => s + w.count, 0);

    kpi = {
      totalDeals,
      winRate:
        completedItems.length > 0
          ? Math.round((wonItems.length / completedItems.length) * 100)
          : 0,
      avgDealSize: totalDeals > 0 ? Math.round(totalValue / totalDeals) : 0,
      tasksPerWeek: Math.round((totalTasksDone / weeks) * 10) / 10,
      contentPerWeek: Math.round((totalContent / weeks) * 10) / 10,
    };
  } catch {
    // keep defaults
  }

  return NextResponse.json({
    // existing breakdowns
    sponsorsByTier,
    sponsorsByStatus,
    contentByPlatform,
    tasksByStatus,
    tasksByProject,
    // new time-series trends
    pipelineByWeek,
    tasksCompletedByWeek,
    contentByWeek,
    contactsByWeek,
    // pipeline funnel
    pipelineFunnel,
    // KPI summary
    kpi,
  });
});
