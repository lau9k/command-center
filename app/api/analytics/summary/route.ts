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

function dayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function weekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().slice(0, 10);
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function groupByDay<T>(
  rows: T[],
  dateField: keyof T
): { date: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = dayKey(String(row[dateField]));
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
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

/** Safe count query that returns 0 on error */
async function safeCount(
  queryFn: () => PromiseLike<{ count: number | null; error: unknown }>
): Promise<number> {
  try {
    const { count, error } = await queryFn();
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export interface AnalyticsSummaryResponse {
  kpis: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    totalContacts: number;
    newContactsThisMonth: number;
    totalDeals: number;
    totalDealValue: number;
    totalPosts: number;
    netWorth: number;
  };
  taskCompletionTrend: { date: string; count: number }[];
  tasksByStatus: { status: string; count: number }[];
  contactsByStatus: { status: string; count: number }[];
  pipelineFunnel: {
    stage_name: string;
    count: number;
    value: number;
    conversion_rate: number;
  }[];
  contentCadence: { week: string; count: number }[];
  contentByStatus: { status: string; count: number }[];
  incomeVsExpenses: {
    month: string;
    income: number;
    expenses: number;
  }[];
}

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period") || "30d";
  const days = VALID_PERIODS[periodParam] ?? 30;
  const startDate = getStartDate(days);

  // Calculate start of current month for "new this month" contacts
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Calculate 3 months ago for income vs expenses
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const financeStart = threeMonthsAgo.toISOString();

  // Run all queries in parallel for performance
  const [
    totalTasksResult,
    completedTasksResult,
    overdueTasksResult,
    totalContactsResult,
    newContactsResult,
    totalPostsResult,
    tasksInPeriod,
    contactsData,
    contentData,
    contentAllData,
    stagesResult,
    pipelineItemsResult,
    transactionsResult,
  ] = await Promise.all([
    // KPI counts
    safeCount(() =>
      supabase.from("tasks").select("*", { count: "exact", head: true })
    ),
    safeCount(() =>
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", "done")
    ),
    safeCount(() =>
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .lt("due_date", now.toISOString())
        .neq("status", "done")
    ),
    safeCount(() =>
      supabase.from("contacts").select("*", { count: "exact", head: true })
    ),
    safeCount(() =>
      supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStart)
    ),
    safeCount(() =>
      supabase
        .from("content_posts")
        .select("*", { count: "exact", head: true })
    ),

    // Task completion trend (daily)
    supabase
      .from("tasks")
      .select("updated_at")
      .eq("status", "done")
      .gte("updated_at", startDate)
      .then((r) => r.data ?? []),

    // Contacts by status
    supabase
      .from("contacts")
      .select("status")
      .then((r) => r.data ?? []),

    // Content posts in period (for cadence)
    supabase
      .from("content_posts")
      .select("created_at")
      .gte("created_at", startDate)
      .then((r) => r.data ?? []),

    // Content by status (all time)
    supabase
      .from("content_posts")
      .select("status")
      .then((r) => r.data ?? []),

    // Pipeline stages
    supabase
      .from("pipeline_stages")
      .select("id, name, sort_order")
      .order("sort_order", { ascending: true })
      .then((r) => r.data ?? []),

    // Pipeline items
    supabase
      .from("pipeline_items")
      .select("stage_id, metadata")
      .then((r) => r.data ?? []),

    // Transactions (last 3 months)
    supabase
      .from("transactions")
      .select("amount, type, created_at")
      .gte("created_at", financeStart)
      .then((r) => r.data ?? []),
  ]);

  // --- Task completion trend (daily) ---
  const taskCompletionTrend = groupByDay(tasksInPeriod, "updated_at");

  // --- Tasks by status ---
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

  // --- Contacts by status ---
  const contactStatusCounts: Record<string, number> = {};
  for (const row of contactsData) {
    const status = row.status || "unknown";
    contactStatusCounts[status] = (contactStatusCounts[status] || 0) + 1;
  }
  const contactsByStatus = Object.entries(contactStatusCounts).map(
    ([status, count]) => ({ status, count })
  );

  // --- Pipeline funnel ---
  const totalPipelineItems = pipelineItemsResult.length;
  const itemsByStage = new Map<string, { count: number; value: number }>();
  let totalDealValue = 0;

  for (const item of pipelineItemsResult) {
    const existing = itemsByStage.get(item.stage_id) ?? {
      count: 0,
      value: 0,
    };
    const value = parseDealValue(
      item.metadata as Record<string, unknown> | null
    );
    existing.count += 1;
    existing.value += value;
    totalDealValue += value;
    itemsByStage.set(item.stage_id, existing);
  }

  const pipelineFunnel = stagesResult.map((stage) => {
    const bucket = itemsByStage.get(stage.id) ?? { count: 0, value: 0 };
    return {
      stage_name: stage.name,
      count: bucket.count,
      value: bucket.value,
      conversion_rate:
        totalPipelineItems > 0
          ? Math.round((bucket.count / totalPipelineItems) * 100)
          : 0,
    };
  });

  // --- Content cadence (posts per week) ---
  const contentCadence = groupByWeek(contentData, "created_at");

  // --- Content by status ---
  const contentStatusCounts: Record<string, number> = {};
  for (const row of contentAllData) {
    const status = row.status || "unknown";
    contentStatusCounts[status] = (contentStatusCounts[status] || 0) + 1;
  }
  const contentByStatus = Object.entries(contentStatusCounts).map(
    ([status, count]) => ({ status, count })
  );

  // --- Income vs Expenses (last 3 months) ---
  const monthBuckets: Record<string, { income: number; expenses: number }> = {};
  for (const tx of transactionsResult) {
    const month = monthKey(tx.created_at);
    if (!monthBuckets[month]) monthBuckets[month] = { income: 0, expenses: 0 };
    const amount = Math.abs(Number(tx.amount) || 0);
    if (tx.type === "income") {
      monthBuckets[month].income += amount;
    } else {
      monthBuckets[month].expenses += amount;
    }
  }
  const incomeVsExpenses = Object.entries(monthBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      income: Math.round(data.income * 100) / 100,
      expenses: Math.round(data.expenses * 100) / 100,
    }));

  // --- Net worth (income - expenses all time) ---
  let netWorth = 0;
  try {
    const { data } = await supabase
      .from("transactions")
      .select("amount, type");
    if (data) {
      for (const tx of data) {
        const amount = Number(tx.amount) || 0;
        if (tx.type === "income") {
          netWorth += Math.abs(amount);
        } else {
          netWorth -= Math.abs(amount);
        }
      }
    }
  } catch {
    netWorth = 0;
  }

  const response: AnalyticsSummaryResponse = {
    kpis: {
      totalTasks: totalTasksResult,
      completedTasks: completedTasksResult,
      overdueTasks: overdueTasksResult,
      totalContacts: totalContactsResult,
      newContactsThisMonth: newContactsResult,
      totalDeals: totalPipelineItems,
      totalDealValue,
      totalPosts: totalPostsResult,
      netWorth: Math.round(netWorth * 100) / 100,
    },
    taskCompletionTrend,
    tasksByStatus,
    contactsByStatus,
    pipelineFunnel,
    contentCadence,
    contentByStatus,
    incomeVsExpenses,
  };

  return NextResponse.json(response);
});
