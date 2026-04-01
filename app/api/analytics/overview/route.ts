import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

const SYNC_TABLES = [
  "contacts",
  "tasks",
  "pipeline_items",
  "content_posts",
  "meetings",
] as const;

function weekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function weeksAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString();
}

export interface AnalyticsOverviewResponse {
  contacts: {
    total: number;
    newThisWeek: number;
    newThisMonth: number;
    byQualifiedStatus: { status: string; count: number }[];
    weeklyGrowth: { week: string; count: number }[];
  };
  pipeline: {
    totalValue: number;
    dealCount: number;
    byStage: { stage: string; count: number; value: number }[];
    avgVelocityDays: number;
  };
  tasks: {
    total: number;
    completedThisWeek: number;
    overdueCount: number;
    byStatus: { status: string; count: number }[];
    weeklyCompletion: { week: string; count: number }[];
  };
  sync: {
    table: string;
    synced: number;
    pending: number;
    failed: number;
    skipped: number;
  }[];
}

export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();
  const now = new Date();
  const eightWeeksAgo = weeksAgo(8);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekStartIso = weekStart.toISOString();

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // --- All queries in parallel ---
  const [
    contactsTotalResult,
    contactsNewWeekResult,
    contactsNewMonthResult,
    contactsQualifiedResult,
    contactsRecentResult,
    stagesResult,
    pipelineItemsResult,
    tasksTotalResult,
    tasksCompletedWeekResult,
    tasksOverdueResult,
    tasksStatusResult,
    tasksCompletedRecentResult,
    ...syncResults
  ] = await Promise.all([
    // Contacts
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekStartIso),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase.from("contacts").select("qualified_status"),
    supabase
      .from("contacts")
      .select("created_at")
      .gte("created_at", eightWeeksAgo),

    // Pipeline
    supabase
      .from("pipeline_stages")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true }),
    supabase.from("pipeline_items").select("stage_id, metadata, created_at, updated_at"),

    // Tasks
    supabase.from("tasks").select("*", { count: "exact", head: true }),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("status", "done")
      .gte("updated_at", weekStartIso),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .lt("due_date", now.toISOString())
      .neq("status", "done"),
    supabase.from("tasks").select("status"),
    supabase
      .from("tasks")
      .select("updated_at")
      .eq("status", "done")
      .gte("updated_at", eightWeeksAgo),

    // Sync health for all 5 tables
    ...SYNC_TABLES.map((table) =>
      supabase
        .from(table)
        .select("personize_sync_status")
    ),
  ]);

  // --- Contacts ---
  const qualifiedCounts: Record<string, number> = {};
  for (const row of contactsQualifiedResult.data ?? []) {
    const s = (row.qualified_status as string) || "unknown";
    qualifiedCounts[s] = (qualifiedCounts[s] || 0) + 1;
  }

  const contactWeeklyCounts: Record<string, number> = {};
  for (const row of contactsRecentResult.data ?? []) {
    const wk = weekKey(row.created_at);
    contactWeeklyCounts[wk] = (contactWeeklyCounts[wk] || 0) + 1;
  }
  const weeklyGrowth = Object.entries(contactWeeklyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // --- Pipeline ---
  const stages = stagesResult.data ?? [];
  const items = pipelineItemsResult.data ?? [];
  const stageMap = new Map<string, { count: number; value: number }>();
  let totalValue = 0;

  for (const item of items) {
    const bucket = stageMap.get(item.stage_id) ?? { count: 0, value: 0 };
    const meta = item.metadata as Record<string, unknown> | null;
    let val = 0;
    if (meta) {
      const raw = meta.deal_value;
      if (typeof raw === "number") val = raw;
      else if (typeof raw === "string") {
        val = parseFloat(raw.replace(/[$,\s]/g, "")) || 0;
      }
    }
    bucket.count += 1;
    bucket.value += val;
    totalValue += val;
    stageMap.set(item.stage_id, bucket);
  }

  const byStage = stages.map((s) => {
    const b = stageMap.get(s.id) ?? { count: 0, value: 0 };
    return { stage: s.name, count: b.count, value: Math.round(b.value * 100) / 100 };
  });

  // Avg velocity: average days between created_at and updated_at across all items
  let totalDays = 0;
  let velocityCount = 0;
  for (const item of items) {
    if (item.created_at && item.updated_at) {
      const diff =
        (new Date(item.updated_at).getTime() - new Date(item.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      if (diff > 0) {
        totalDays += diff;
        velocityCount += 1;
      }
    }
  }

  // --- Tasks ---
  const statusCounts: Record<string, number> = {};
  for (const row of (tasksStatusResult.data ?? [])) {
    const s = (row.status as string) || "unknown";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const taskWeeklyCounts: Record<string, number> = {};
  for (const row of (tasksCompletedRecentResult.data ?? [])) {
    const wk = weekKey(row.updated_at);
    taskWeeklyCounts[wk] = (taskWeeklyCounts[wk] || 0) + 1;
  }
  const weeklyCompletion = Object.entries(taskWeeklyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, count]) => ({ week, count }));

  // --- Sync health ---
  const sync = SYNC_TABLES.map((table, i) => {
    const rows = syncResults[i].data ?? [];
    const counts = { synced: 0, pending: 0, failed: 0, skipped: 0 };
    for (const row of rows) {
      const s = (row.personize_sync_status as string) || "pending";
      if (s in counts) counts[s as keyof typeof counts] += 1;
      else counts.pending += 1;
    }
    return { table, ...counts };
  });

  const response: AnalyticsOverviewResponse = {
    contacts: {
      total: contactsTotalResult.count ?? 0,
      newThisWeek: contactsNewWeekResult.count ?? 0,
      newThisMonth: contactsNewMonthResult.count ?? 0,
      byQualifiedStatus: Object.entries(qualifiedCounts).map(([status, count]) => ({
        status,
        count,
      })),
      weeklyGrowth,
    },
    pipeline: {
      totalValue: Math.round(totalValue * 100) / 100,
      dealCount: items.length,
      byStage,
      avgVelocityDays: velocityCount > 0 ? Math.round(totalDays / velocityCount) : 0,
    },
    tasks: {
      total: tasksTotalResult.count ?? 0,
      completedThisWeek: tasksCompletedWeekResult.count ?? 0,
      overdueCount: tasksOverdueResult.count ?? 0,
      byStatus: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      })),
      weeklyCompletion,
    },
    sync,
  };

  return NextResponse.json(response);
});
