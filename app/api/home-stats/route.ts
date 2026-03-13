import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

export interface HomeStatsResponse {
  activeTasks: number;
  activeProjectCount: number;
  totalContentPosts: number;
  contentDraftCount: number;
  contentScheduledCount: number;
  contentPublishedCount: number;
  contentThisWeek: number;
  contactsCount: number;
  conversationsCount: number;
  pipelineItemCount: number;
  pipelineTotalValue: number;
  openInvoiceTotal: number;
  memoryRecords: number;
  sponsorsTotal: number;
  sponsorsConfirmed: number;
  sponsorsConfirmedRevenue: number;
  overdueTasks: number;
  tasksCompletedToday: number;
  newContactsThisWeek: number;
  lastUpdated: string;
}

/** Safely query a table, returning a fallback on error (e.g. table doesn't exist). */
async function safeQuery<T>(
  fn: () => PromiseLike<{ data: T | null; error: unknown }>,
  fallback: T,
): Promise<T> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.error("[home-stats] query error:", error);
      return fallback;
    }
    return data ?? fallback;
  } catch (err) {
    console.error("[home-stats] unexpected error:", err);
    return fallback;
  }
}

async function safeCount(
  fn: () => PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  try {
    const { count, error } = await fn();
    if (error) {
      console.error("[home-stats] count error:", error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.error("[home-stats] unexpected count error:", err);
    return 0;
  }
}

export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    tasks,
    contactsCount,
    allContent,
    pipelineCount,
    pipelineValues,
    invoices,
    memoryStats,
    sponsorsAll,
    sponsorsConfirmedRes,
    overdueTasks,
    tasksCompletedToday,
    newContactsThisWeek,
    conversationsCount,
  ] = await Promise.all([
    // Tasks (need status + project_id for active count + project count)
    safeQuery(
      () =>
        supabase
          .from("tasks")
          .select("status, project_id"),
      [] as { status: string; project_id: string | null }[],
    ),

    // Contacts count
    safeCount(() =>
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true }),
    ),

    // All content posts (need status + scheduled_for)
    safeQuery(
      () =>
        supabase
          .from("content_posts")
          .select("status, scheduled_for"),
      [] as { status: string; scheduled_for: string | null }[],
    ),

    // Pipeline count
    safeCount(() =>
      supabase
        .from("pipeline_items")
        .select("id", { count: "exact", head: true }),
    ),

    // Pipeline values: join pipeline_stages to exclude "lost" stage by slug,
    // and read value from metadata->value since pipeline_items has no value column
    safeQuery(
      () =>
        supabase
          .from("pipeline_items")
          .select("metadata, pipeline_stages!inner(slug)")
          .neq("pipeline_stages.slug", "lost"),
      [] as { metadata: Record<string, unknown> | null; pipeline_stages: { slug: string }[] }[],
    ),

    // Open invoices
    safeQuery(
      () =>
        supabase
          .from("invoices")
          .select("amount, status")
          .in("status", ["sent", "overdue"]),
      [] as { amount: number | null; status: string }[],
    ),

    // Memory stats — sum both legacy "count" and newer "record_count" columns
    safeQuery(
      () => supabase.from("memory_stats").select("count, record_count"),
      [] as { count: number; record_count: number | null }[],
    ),

    // Sponsors total count
    safeCount(() =>
      supabase
        .from("sponsors")
        .select("id", { count: "exact", head: true }),
    ),

    // Sponsors confirmed (with amount for revenue)
    safeQuery(
      () =>
        supabase
          .from("sponsors")
          .select("amount")
          .eq("status", "confirmed"),
      [] as { amount: number | null }[],
    ),

    // Overdue tasks (not done, due_date < today)
    safeCount(() =>
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .neq("status", "done")
        .lt("due_date", todayStart),
    ),

    // Tasks completed today
    safeCount(() =>
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "done")
        .gte("updated_at", todayStart),
    ),

    // New contacts this week
    safeCount(() =>
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo),
    ),

    // Conversations count
    safeCount(() =>
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true }),
    ),
  ]);

  // Compute KPIs
  const activeTasks = tasks.filter((t) => t.status !== "done").length;
  const activeProjectIds = new Set(
    tasks.filter((t) => t.status !== "done").map((t) => t.project_id).filter(Boolean),
  );

  const contentThisWeek = allContent.filter((p) => {
    if (!p.scheduled_for) return false;
    const d = new Date(p.scheduled_for);
    return d >= now && d <= weekFromNow;
  }).length;

  const totalContentPosts = allContent.length;
  const contentDraftCount = allContent.filter((p) => p.status === "draft").length;
  const contentScheduledCount = allContent.filter((p) => p.status === "scheduled").length;
  const contentPublishedCount = allContent.filter((p) => p.status === "published").length;

  const pipelineTotalValue = pipelineValues.reduce(
    (sum, item) => sum + Number((item.metadata as Record<string, unknown>)?.value ?? 0),
    0,
  );

  const openInvoiceTotal = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount ?? 0),
    0,
  );

  const memoryRecords = memoryStats.reduce(
    (sum, s) => sum + (s.record_count ?? s.count ?? 0),
    0,
  );

  const sponsorsConfirmedRevenue = sponsorsConfirmedRes.reduce(
    (sum, s) => sum + Number(s.amount ?? 0),
    0,
  );

  const response: HomeStatsResponse = {
    activeTasks,
    activeProjectCount: activeProjectIds.size,
    totalContentPosts,
    contentDraftCount,
    contentScheduledCount,
    contentPublishedCount,
    contentThisWeek,
    contactsCount,
    conversationsCount,
    pipelineItemCount: pipelineCount,
    pipelineTotalValue,
    openInvoiceTotal,
    memoryRecords,
    sponsorsTotal: sponsorsAll,
    sponsorsConfirmed: sponsorsConfirmedRes.length,
    sponsorsConfirmedRevenue,
    overdueTasks,
    tasksCompletedToday,
    newContactsThisWeek,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json({ data: response });
});
