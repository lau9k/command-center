import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { fetchCommunityMemberCount } from "@/lib/telegram/community";
import { scoreTask } from "@/lib/task-scoring";
import type { ContentPost, Meeting, TaskWithProject } from "@/lib/types/database";
import type { ScoringFactor } from "@/lib/task-scoring";

// ---------- Sub-types used in the response ----------

export interface OutreachStats {
  queued: number;
  sent: number;
  replied: number;
  no_response: number;
  skipped: number;
  total: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  taskCount: number;
  upcomingTasks: { id: string; title: string; due_date: string | null }[];
}

export interface RankedTask extends TaskWithProject {
  score: number;
  factors: ScoringFactor[];
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UpcomingMeeting {
  id: string;
  title: string;
  meeting_date: string | null;
}

export interface OverdueTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
}

export interface ScheduledContentItem {
  id: string;
  title: string | null;
  scheduled_for: string | null;
  platform: string | null;
}

// ---------- Main response interface ----------

export interface HomeStatsResponse {
  // KPI numbers
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

  // Community
  communityMemberCount: number;
  communityDelta: number | null;

  // Section data
  pendingMeetings: Meeting[];
  activityLog: ActivityLogEntry[];
  rankedTasks: RankedTask[];
  projectSummaries: ProjectSummary[];
  allContent: ContentPost[];
  outreachStats: OutreachStats;

  // Upcoming items panel
  overdueTasksList: OverdueTask[];
  upcomingMeetings: UpcomingMeeting[];
  scheduledContent: ScheduledContentItem[];

  // Module health (raw counts used by ModuleHealthOverview)
  totalTasksCount: number;
}

/** Safely query a table, returning a fallback on error (e.g. table doesn't exist or FK mismatch). */
async function safeQuery<T>(
  label: string,
  fn: () => PromiseLike<{ data: T | null; error: unknown }>,
  fallback: T,
): Promise<T> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.warn(`[home-stats] ${label} failed:`, (error as { message?: string }).message ?? error);
      return fallback;
    }
    return data ?? fallback;
  } catch (err) {
    console.warn(`[home-stats] ${label} threw:`, (err as Error).message ?? err);
    return fallback;
  }
}

async function safeCount(
  label: string,
  fn: () => PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  try {
    const { count, error } = await fn();
    if (error) {
      console.warn(`[home-stats] ${label} failed:`, (error as { message?: string }).message ?? error);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.warn(`[home-stats] ${label} threw:`, (err as Error).message ?? err);
    return 0;
  }
}

/** Fetch all aggregated home dashboard stats in a single batch. */
export async function getHomeStats(): Promise<HomeStatsResponse> {
  const supabase = createServiceClient();

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    tasks,
    projects,
    allContent,
    contactsCount,
    pipelineCount,
    pipelineValues,
    invoices,
    memoryStats,
    sponsorsAll,
    sponsorsConfirmedRes,
    overdueTasksCount,
    tasksCompletedToday,
    newContactsThisWeek,
    conversationsCount,
    communityMemberCount,
    yesterdayStats,
    pendingMeetings,
    activityLog,
    overdueTasksList,
    upcomingMeetings,
    scheduledContent,
    outreachRows,
  ] = await Promise.all([
    // Tasks with full details for ranking + project summaries
    safeQuery(
      "tasks",
      () =>
        supabase
          .from("tasks")
          .select("id, project_id, title, status, priority, due_date, updated_at, projects(id, name, slug, color, status)")
          .order("updated_at", { ascending: false }),
      [] as { id: string; project_id: string | null; title: string; status: string; priority: string; due_date: string | null; updated_at: string; projects: { id: string; name: string; slug: string; color: string | null; status: string }[] }[],
    ),

    // Active projects
    safeQuery(
      "projects",
      () =>
        supabase
          .from("projects")
          .select("id, name, slug, status")
          .eq("status", "active")
          .order("name", { ascending: true }),
      [] as { id: string; name: string; slug: string; status: string }[],
    ),

    // All content posts (full data for calendar preview)
    safeQuery(
      "content_posts",
      () =>
        supabase
          .from("content_posts")
          .select("id, status, scheduled_at, scheduled_for, platforms, platform, project_id, title, caption")
          .order("scheduled_at", { ascending: true, nullsFirst: false })
          .returns<ContentPost[]>(),
      [] as ContentPost[],
    ),

    // Contacts count
    safeCount("contacts_count", () =>
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true }),
    ),

    // Pipeline count
    safeCount("pipeline_count", () =>
      supabase
        .from("pipeline_items")
        .select("id", { count: "exact", head: true }),
    ),

    // Pipeline values (exclude "lost" stage)
    safeQuery(
      "pipeline_values",
      () =>
        supabase
          .from("pipeline_items")
          .select("metadata, pipeline_stages!inner(slug)")
          .neq("pipeline_stages.slug", "lost"),
      [] as { metadata: Record<string, unknown> | null; pipeline_stages: { slug: string }[] }[],
    ),

    // Open invoices
    safeQuery(
      "invoices",
      () =>
        supabase
          .from("invoices")
          .select("amount, status")
          .in("status", ["sent", "overdue"]),
      [] as { amount: number | null; status: string }[],
    ),

    // Memory stats
    safeQuery(
      "memory_stats",
      () => supabase.from("memory_stats").select("count"),
      [] as { count: number }[],
    ),

    // Sponsors total count
    safeCount("sponsors_total", () =>
      supabase
        .from("sponsors")
        .select("id", { count: "exact", head: true }),
    ),

    // Sponsors confirmed (with amount for revenue)
    safeQuery(
      "sponsors_confirmed",
      () =>
        supabase
          .from("sponsors")
          .select("amount")
          .eq("status", "confirmed"),
      [] as { amount: number | null }[],
    ),

    // Overdue tasks count
    safeCount("overdue_tasks", () =>
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .neq("status", "done")
        .lt("due_date", todayStart),
    ),

    // Tasks completed today
    safeCount("tasks_completed_today", () =>
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "done")
        .gte("updated_at", todayStart),
    ),

    // New contacts this week
    safeCount("new_contacts_week", () =>
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo),
    ),

    // Conversations count
    safeCount("conversations", () =>
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true }),
    ),

    // Community member count (Telegram API)
    fetchCommunityMemberCount(),

    // Yesterday's community stats for delta calculation
    safeQuery(
      "community_stats",
      () =>
        supabase
          .from("community_stats")
          .select("member_count")
          .lt("fetched_at", yesterday)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .single(),
      null as { member_count: number } | null,
    ),

    // Pending meetings
    safeQuery(
      "pending_meetings",
      () =>
        supabase
          .from("meetings")
          .select("*")
          .eq("status", "pending_review")
          .order("meeting_date", { ascending: false }),
      [] as Meeting[],
    ),

    // Activity log (last 15 entries)
    safeQuery(
      "activity_log",
      () =>
        supabase
          .from("activity_log")
          .select("id, action, entity_type, entity_id, entity_name, source, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(15),
      [] as ActivityLogEntry[],
    ),

    // Overdue tasks list (for upcoming items panel)
    safeQuery(
      "overdue_tasks_list",
      () =>
        supabase
          .from("tasks")
          .select("id, title, due_date, priority")
          .neq("status", "done")
          .lt("due_date", todayStart)
          .order("due_date", { ascending: true })
          .limit(5),
      [] as OverdueTask[],
    ),

    // Upcoming meetings (next 3)
    safeQuery(
      "upcoming_meetings",
      () =>
        supabase
          .from("meetings")
          .select("id, title, meeting_date")
          .gte("meeting_date", now.toISOString())
          .order("meeting_date", { ascending: true })
          .limit(3),
      [] as UpcomingMeeting[],
    ),

    // Scheduled content (next 3)
    safeQuery(
      "scheduled_content",
      () =>
        supabase
          .from("content_posts")
          .select("id, title, scheduled_for, platform")
          .eq("status", "scheduled")
          .gte("scheduled_for", now.toISOString())
          .order("scheduled_for", { ascending: true })
          .limit(3),
      [] as ScheduledContentItem[],
    ),

    // Outreach funnel stats
    safeQuery(
      "outreach_stats",
      () =>
        supabase
          .from("tasks")
          .select("outreach_status")
          .eq("task_type", "outreach"),
      [] as { outreach_status: string | null }[],
    ),
  ]);

  // --- KPI computations ---
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
    (sum, s) => sum + (s.count ?? 0),
    0,
  );

  const sponsorsConfirmedRevenue = sponsorsConfirmedRes.reduce(
    (sum, s) => sum + Number(s.amount ?? 0),
    0,
  );

  // Community growth delta
  const yesterdayMemberCount = yesterdayStats?.member_count ?? null;
  const communityDelta =
    yesterdayMemberCount !== null && yesterdayMemberCount > 0 && communityMemberCount > 0
      ? Math.round(
          ((communityMemberCount - yesterdayMemberCount) / yesterdayMemberCount) * 100,
        )
      : null;

  // Outreach funnel stats
  const outreachStats: OutreachStats = {
    queued: 0,
    sent: 0,
    replied: 0,
    no_response: 0,
    skipped: 0,
    total: outreachRows.length,
  };
  for (const row of outreachRows) {
    const s = row.outreach_status as keyof OutreachStats;
    if (s in outreachStats && s !== "total") {
      outreachStats[s]++;
    }
  }

  // --- Ranked tasks (priority engine) ---
  const openTasks = (tasks as unknown as TaskWithProject[]).filter((t) => t.status !== "done");
  const rankedTasks: RankedTask[] = openTasks
    .map((task) => {
      const { score, factors } = scoreTask(task, task.projects);
      return { ...task, score, factors };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // --- Project summary cards ---
  const projectSummaries: ProjectSummary[] = projects.map((p) => {
    const projectTasks = tasks.filter((t) => t.project_id === p.id);
    const projectOpenTasks = projectTasks.filter((t) => t.status !== "done");
    const upcoming = projectOpenTasks
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      })
      .slice(0, 3);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      taskCount: projectOpenTasks.length,
      upcomingTasks: upcoming.map((t) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
      })),
    };
  });

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
    overdueTasks: overdueTasksCount,
    tasksCompletedToday,
    newContactsThisWeek,
    lastUpdated: new Date().toISOString(),

    communityMemberCount,
    communityDelta,

    pendingMeetings,
    activityLog,
    rankedTasks,
    projectSummaries,
    allContent,
    outreachStats,

    overdueTasksList,
    upcomingMeetings,
    scheduledContent,

    totalTasksCount: tasks.length,
  };

  return response;
}

export const GET = withErrorHandler(async function GET() {
  const response = await getHomeStats();
  return NextResponse.json({ data: response });
});
