import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { fetchCommunityMemberCount } from "@/lib/telegram/community";
import { scoreTask } from "@/lib/task-scoring";
import { cached, getRedis } from "@/lib/cache/redis";
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

// ---------- Dashboard summary RPC response shape ----------

interface DashboardSummary {
  active_tasks: number;
  overdue_tasks: number;
  tasks_completed_today: number;
  total_tasks: number;
  active_project_count: number;
  total_content_posts: number;
  content_draft: number;
  content_scheduled: number;
  content_published: number;
  content_this_week: number;
  contacts_count: number;
  new_contacts_week: number;
  conversations_count: number;
  pipeline_count: number;
  pipeline_total_value: number;
  open_invoice_total: number;
  memory_records: number;
  sponsors_total: number;
  sponsors_confirmed: number;
  sponsors_confirmed_rev: number;
  yesterday_member_count: number | null;
  outreach_queued: number;
  outreach_sent: number;
  outreach_replied: number;
  outreach_no_response: number;
  outreach_skipped: number;
  outreach_total: number;
}

// ---------- Health meta ----------

export interface HomeStatsMeta {
  status: "ok" | "rpc_missing" | "empty_data" | "error";
  degraded: boolean;
  reason?: string;
}

// ---------- Main response interface ----------

export interface HomeStatsResponse {
  _meta: HomeStatsMeta;
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
  enrichment_pct: number;
  contacts_source: "supabase";
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

/** Safely query a table, returning a fallback on error. Pushes label to warnings on failure. */
async function safeQuery<T>(
  label: string,
  fn: () => PromiseLike<{ data: T | null; error: unknown }>,
  fallback: T,
  warnings: string[],
): Promise<T> {
  try {
    const { data, error } = await fn();
    if (error) {
      console.warn(`[home-stats] ${label} failed:`, (error as { message?: string }).message ?? error);
      warnings.push(label);
      return fallback;
    }
    return data ?? fallback;
  } catch (err) {
    console.warn(`[home-stats] ${label} threw:`, (err as Error).message ?? err);
    warnings.push(label);
    return fallback;
  }
}

/** Default empty summary for when the RPC fails. */
const EMPTY_SUMMARY: DashboardSummary = {
  active_tasks: 0, overdue_tasks: 0, tasks_completed_today: 0, total_tasks: 0,
  active_project_count: 0, total_content_posts: 0, content_draft: 0,
  content_scheduled: 0, content_published: 0, content_this_week: 0,
  contacts_count: 0, new_contacts_week: 0, conversations_count: 0,
  pipeline_count: 0, pipeline_total_value: 0, open_invoice_total: 0,
  memory_records: 0, sponsors_total: 0, sponsors_confirmed: 0,
  sponsors_confirmed_rev: 0, yesterday_member_count: null,
  outreach_queued: 0, outreach_sent: 0, outreach_replied: 0,
  outreach_no_response: 0, outreach_skipped: 0, outreach_total: 0,
};

/**
 * Fetch all aggregated home dashboard stats.
 *
 * Architecture (April 2026 refactor):
 * - KPI counts/sums → single get_dashboard_summary() RPC (replaces 12 individual queries)
 * - Full-row data for widgets → individual queries (tasks, projects, content, meetings, activity)
 * - External API calls → cached via lib/cache/redis (Telegram)
 *
 * Total: 1 RPC + 10 data queries + 1 cached external call = 12 parallel calls
 * (down from 23 before the RPC consolidation)
 */
export async function getHomeStats(): Promise<{ data: HomeStatsResponse; warnings: string[] }> {
  const supabase = createServiceClient();
  const warnings: string[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // ── Parallel fan-out: 1 RPC + 8 data queries + 3 cached external calls ──
  const [
    summaryResult,
    tasks,
    projects,
    allContent,
    contactsResult,
    communityMemberCount,
    pendingMeetings,
    activityLog,
    overdueTasksList,
    upcomingMeetings,
    scheduledContent,
    enrichedContactsCount,
  ] = await Promise.all([
    // 1) Single RPC replaces 12 individual count/sum queries (cached 60 s)
    cached<{ summary: DashboardSummary; rpcError: boolean }>(
      "home:dashboard:summary",
      async () => {
        const { data, error } = await supabase.rpc("get_dashboard_summary");
        if (error) {
          console.warn("[home-stats] get_dashboard_summary RPC failed:", error.message);
          warnings.push("Dashboard summary");
          return { summary: EMPTY_SUMMARY, rpcError: true };
        }
        return { summary: (data as DashboardSummary) ?? EMPTY_SUMMARY, rpcError: false };
      },
      { ttlMs: 60_000 },
    ),

    // 2) Tasks with full details — needed for ranking engine + project summaries
    safeQuery(
      "tasks",
      () =>
        supabase
          .from("tasks")
          .select("id, project_id, title, status, priority, due_date, updated_at, projects(id, name, slug, color, status)")
          .order("updated_at", { ascending: false }),
      [] as { id: string; project_id: string | null; title: string; status: string; priority: string; due_date: string | null; updated_at: string; projects: { id: string; name: string; slug: string; color: string | null; status: string }[] }[],
      warnings,
    ),

    // 3) Active projects — needed for project summary cards
    safeQuery(
      "projects",
      () =>
        supabase
          .from("projects")
          .select("id, name, slug, status")
          .eq("status", "active")
          .order("name", { ascending: true }),
      [] as { id: string; name: string; slug: string; status: string }[],
      warnings,
    ),

    // 4) All content posts — needed for calendar preview widget
    safeQuery(
      "content_posts",
      () =>
        supabase
          .from("content_posts")
          .select("id, status, scheduled_at, scheduled_for, platforms, platform, project_id, title, caption")
          .order("scheduled_at", { ascending: true, nullsFirst: false })
          .returns<ContentPost[]>(),
      [] as ContentPost[],
      warnings,
    ),

    // 5) Contacts count — Supabase primary (cached 15 min)
    cached<{ count: number; source: "supabase" }>(
      "home:contacts:count",
      async () => {
        const { count, error } = await supabase
          .from("contacts")
          .select("*", { count: "exact", head: true });
        if (error) {
          console.warn("[home-stats] Supabase contacts count failed:", error.message);
          return { count: 0, source: "supabase" as const };
        }
        return { count: count ?? 0, source: "supabase" as const };
      },
      { ttlMs: 15 * 60 * 1000 },
    ),

    // 6) Community member count — Telegram API (cached 15 min)
    cached<number>(
      "home:telegram:members",
      () => fetchCommunityMemberCount(),
      { ttlMs: 15 * 60 * 1000 },
    ),

    // 7) Pending meetings — full rows for review panel
    safeQuery(
      "pending_meetings",
      () =>
        supabase
          .from("meetings")
          .select("*")
          .eq("status", "pending_review")
          .order("meeting_date", { ascending: false }),
      [] as Meeting[],
      warnings,
    ),

    // 8) Activity log — last 15 entries
    safeQuery(
      "activity_log",
      () =>
        supabase
          .from("activity_log")
          .select("id, action, entity_type, entity_id, entity_name, source, metadata, created_at")
          .order("created_at", { ascending: false })
          .limit(15),
      [] as ActivityLogEntry[],
      warnings,
    ),

    // 9) Overdue tasks list — full rows for upcoming panel
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
      warnings,
    ),

    // 10) Upcoming meetings — next 3
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
      warnings,
    ),

    // 11) Scheduled content — next 3
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
      warnings,
    ),

    // 12) Enrichment count — Personize search for contacts with email (cached 15 min)
    cached<number>(
      "home:personize:enrichment",
      async () => {
        const apiBase = "https://agent.personize.ai";
        const apiKey = process.env.PERSONIZE_SECRET_KEY ?? "";
        const collectionId = process.env.PERSONIZE_CONTACTS_COLLECTION_ID ?? "";
        if (!apiKey || !collectionId) {
          console.warn("[home-stats] Missing PERSONIZE_SECRET_KEY or PERSONIZE_CONTACTS_COLLECTION_ID");
          return 0;
        }
        try {
          const response = await fetch(`${apiBase}/api/v1/search`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              collectionIds: [collectionId],
              groups: [
                {
                  conditions: [
                    { propertyName: "email", operator: "exists" },
                  ],
                },
              ],
              returnRecords: true,
              pageSize: 1,
            }),
          });
          if (!response.ok) {
            console.warn(`[home-stats] Personize enrichment search failed: ${response.status}`);
            return 0;
          }
          const data = (await response.json()) as {
            data?: { total?: number; records?: unknown[] };
          };
          return data?.data?.total ?? data?.data?.records?.length ?? 0;
        } catch (err) {
          console.warn("[home-stats] Personize enrichment search error:", err);
          return 0;
        }
      },
      { ttlMs: 15 * 60 * 1000 },
    ),
  ]);

  // ── Read KPIs from RPC summary ──
  const { summary: s, rpcError } = summaryResult;

  // ── Compute _meta health status ──
  const rpcMissing = process.env.__DASHBOARD_RPC_STATUS === "missing";

  let _meta: HomeStatsMeta;
  if (rpcMissing) {
    _meta = { status: "rpc_missing", degraded: true, reason: "get_dashboard_summary RPC is not deployed" };
  } else if (rpcError) {
    _meta = { status: "error", degraded: true, reason: "get_dashboard_summary RPC returned an error" };
  } else if (s === EMPTY_SUMMARY || s.total_tasks === 0) {
    _meta = { status: "empty_data", degraded: true, reason: "Dashboard query returned no data" };
  } else {
    _meta = { status: "ok", degraded: false };
  }

  // Write degraded state to Redis (fire-and-forget)
  if (_meta.degraded) {
    const r = getRedis();
    if (r) {
      r.set("cc:dashboard:health", { ..._meta, timestamp: new Date().toISOString() }, { ex: 300 }).catch(() => {});
    }
  }

  // Use direct Supabase count if available, else fall back to RPC count
  const finalContactsCount = contactsResult.count > 0
    ? contactsResult.count
    : s.contacts_count;

  // Community growth delta
  const communityDelta =
    s.yesterday_member_count !== null && s.yesterday_member_count > 0 && communityMemberCount > 0
      ? Math.round(
          ((communityMemberCount - s.yesterday_member_count) / s.yesterday_member_count) * 100,
        )
      : null;

  // Outreach stats from RPC
  const outreachStats: OutreachStats = {
    queued: s.outreach_queued,
    sent: s.outreach_sent,
    replied: s.outreach_replied,
    no_response: s.outreach_no_response,
    skipped: s.outreach_skipped,
    total: s.outreach_total,
  };

  // ── Ranked tasks (priority engine) — still needs full task rows ──
  const openTasks = (tasks as unknown as TaskWithProject[]).filter((t) => t.status !== "done");
  const rankedTasks: RankedTask[] = openTasks
    .map((task) => {
      const { score, factors } = scoreTask(task, task.projects);
      return { ...task, score, factors };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // ── Project summary cards — still needs full task + project rows ──
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

  // Enrichment coverage percentage
  const enrichment_pct =
    finalContactsCount > 0
      ? Math.round((enrichedContactsCount / finalContactsCount) * 100)
      : 0;

  const response: HomeStatsResponse = {
    _meta,
    activeTasks: s.active_tasks,
    activeProjectCount: s.active_project_count,
    totalContentPosts: s.total_content_posts,
    contentDraftCount: s.content_draft,
    contentScheduledCount: s.content_scheduled,
    contentPublishedCount: s.content_published,
    contentThisWeek: s.content_this_week,
    contactsCount: finalContactsCount,
    enrichment_pct,
    contacts_source: "supabase",
    conversationsCount: s.conversations_count,
    pipelineItemCount: s.pipeline_count,
    pipelineTotalValue: s.pipeline_total_value,
    openInvoiceTotal: s.open_invoice_total,
    memoryRecords: s.memory_records,
    sponsorsTotal: s.sponsors_total,
    sponsorsConfirmed: s.sponsors_confirmed,
    sponsorsConfirmedRevenue: s.sponsors_confirmed_rev,
    overdueTasks: s.overdue_tasks,
    tasksCompletedToday: s.tasks_completed_today,
    newContactsThisWeek: s.new_contacts_week,
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

    totalTasksCount: s.total_tasks,
  };

  return { data: response, warnings };
}

export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  const { data, warnings } = await getHomeStats();
  return NextResponse.json({ data, warnings });
}));
