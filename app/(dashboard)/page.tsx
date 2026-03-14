import { createServiceClient } from "@/lib/supabase/service";
import { fetchCommunityMemberCount } from "@/lib/telegram/community";
import { AIFocusPanelLive } from "@/components/home/ai-focus-panel";
import { DailyBriefingWidget } from "@/components/home/daily-briefing";
import { MemoryHealthWidget } from "@/components/home/memory-health-widget";
import { SessionPromptButton } from "@/components/dashboard/SessionPromptButton";
import { ProjectSummaryCards } from "@/components/dashboard/ProjectSummaryCards";
import { ContentCalendarPreview } from "@/components/dashboard/ContentCalendarPreview";
import { ModuleHealthOverview } from "@/components/dashboard/ModuleHealthOverview";
import { MemoryFlushCard } from "@/components/dashboard/MemoryFlushCard";
import { TelegramHealthCard } from "@/components/dashboard/TelegramHealthCard";
import { GitHubActivityCard } from "@/components/dashboard/GitHubActivityCard";
import { DashboardRefreshListener } from "@/components/dashboard/DashboardRefreshListener";
import { MeetingNotificationList } from "@/components/meetings/meeting-notification";
import { RankedTaskList } from "@/components/tasks/ranked-task-list";
import { KPIStripLive } from "@/components/home/KPIStripLive";
import { LiveActivityStream } from "@/components/home/LiveActivityStream";
import { UpcomingItemsPanel } from "@/components/home/UpcomingItemsPanel";
import { QuickActionsBar } from "@/components/home/QuickActionsBar";
import { DataSourceStatus } from "@/components/home/data-source-status";
import { scoreTask } from "@/lib/task-scoring";
import type { HomeStatsResponse } from "@/app/api/home-stats/route";
import type { ContentPost, Meeting, TaskWithProject } from "@/lib/types/database";

export const dynamic = "force-dynamic";

function getYesterdayISO(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export default async function DashboardPage() {
  const yesterday = getYesterdayISO();
  const serviceClient = createServiceClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Parallel data fetching for all KPI + section data
  const [
    tasksRes,
    projectsRes,
    contentRes,
    allContentRes,
    contactsCountRes,
    invoicesRes,
    memoryRes,
    pipelineCountRes,
    pipelineValueRes,
    communityMemberCount,
    pendingMeetingsRes,
    yesterdayStatsRes,
    sponsorsCountRes,
    sponsorsConfirmedRes,
    activityLogRes,
    overdueTasksRes,
    tasksCompletedTodayRes,
    newContactsThisWeekRes,
    upcomingMeetingsRes,
    scheduledContentRes,
    overdueTasksCountRes,
    conversationsCountRes,
  ] = await Promise.all([
    serviceClient
      .from("tasks")
      .select("id, project_id, title, status, priority, due_date, updated_at, projects(id, name, slug, color, status)")
      .order("updated_at", { ascending: false }),
    serviceClient
      .from("projects")
      .select("id, name, slug, status")
      .eq("status", "active")
      .order("name", { ascending: true }),
    serviceClient
      .from("content_posts")
      .select("id, project_id, title, scheduled_for, updated_at, projects(id, name, color)")
      .order("updated_at", { ascending: false }),
    serviceClient
      .from("content_posts")
      .select("id, status, scheduled_at, scheduled_for, platforms, platform, project_id, title, caption")
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .returns<ContentPost[]>(),
    serviceClient.from("contacts").select("id", { count: "exact", head: true }),
    serviceClient
      .from("invoices")
      .select("amount, status")
      .in("status", ["sent", "overdue"]),
    serviceClient.from("memory_stats").select("count, record_count"),
    serviceClient.from("pipeline_items").select("id", { count: "exact", head: true }),
    serviceClient
      .from("pipeline_items")
      .select("metadata, pipeline_stages!inner(slug)")
      .neq("pipeline_stages.slug", "lost"),
    fetchCommunityMemberCount(),
    serviceClient
      .from("meetings")
      .select("*")
      .eq("status", "pending_review")
      .order("meeting_date", { ascending: false }),
    serviceClient
      .from("community_stats")
      .select("member_count")
      .lt("fetched_at", yesterday)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single(),
    Promise.resolve(
      serviceClient
        .from("sponsors")
        .select("id", { count: "exact", head: true }),
    ).catch(() => ({ count: 0 as number | null, data: null, error: null })),
    Promise.resolve(
      serviceClient
        .from("sponsors")
        .select("amount")
        .eq("status", "confirmed"),
    ).catch(() => ({ data: [] as { amount: number | null }[], error: null })),
    // Activity log (last 15 entries)
    serviceClient
      .from("activity_log")
      .select("id, action, entity_type, entity_id, entity_name, source, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    // Overdue tasks
    serviceClient
      .from("tasks")
      .select("id, title, due_date, priority")
      .neq("status", "done")
      .lt("due_date", todayStart)
      .order("due_date", { ascending: true })
      .limit(5),
    // Tasks completed today count
    serviceClient
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "done")
      .gte("updated_at", todayStart),
    // New contacts this week count
    serviceClient
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    // Upcoming meetings (next 3)
    serviceClient
      .from("meetings")
      .select("id, title, meeting_date")
      .gte("meeting_date", now.toISOString())
      .order("meeting_date", { ascending: true })
      .limit(3),
    // Scheduled content (next 3)
    serviceClient
      .from("content_posts")
      .select("id, title, scheduled_for, platform")
      .eq("status", "scheduled")
      .gte("scheduled_for", now.toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(3),
    // Overdue tasks count (exact, not capped by limit)
    serviceClient
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "done")
      .lt("due_date", todayStart),
    // Conversations count
    serviceClient
      .from("conversations")
      .select("id", { count: "exact", head: true }),
  ]);

  // Log query errors server-side for debugging KPI issues
  const queryResults = [
    { name: "tasks", error: tasksRes.error },
    { name: "projects", error: projectsRes.error },
    { name: "content_posts", error: contentRes.error },
    { name: "all_content", error: allContentRes.error },
    { name: "contacts_count", error: contactsCountRes.error },
    { name: "invoices", error: invoicesRes.error },
    { name: "memory_stats", error: memoryRes.error },
    { name: "pipeline_count", error: pipelineCountRes.error },
    { name: "pipeline_value", error: pipelineValueRes.error },
    { name: "pending_meetings", error: pendingMeetingsRes.error },
    { name: "sponsors_count", error: sponsorsCountRes.error },
    { name: "sponsors_confirmed", error: sponsorsConfirmedRes.error },
    { name: "activity_log", error: activityLogRes.error },
    { name: "overdue_tasks", error: overdueTasksRes.error },
    { name: "tasks_completed_today", error: tasksCompletedTodayRes.error },
    { name: "new_contacts_week", error: newContactsThisWeekRes.error },
    { name: "upcoming_meetings", error: upcomingMeetingsRes.error },
    { name: "scheduled_content", error: scheduledContentRes.error },
    { name: "overdue_tasks_count", error: overdueTasksCountRes.error },
    { name: "conversations_count", error: conversationsCountRes.error },
  ];

  for (const q of queryResults) {
    if (q.error) {
      console.error(`[Dashboard KPI] ${q.name} query error:`, q.error.message);
    }
  }

  const tasks = tasksRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const allContent = (allContentRes.data ?? []) as ContentPost[];
  const totalContactsCount = contactsCountRes.count ?? 0;
  const invoices = invoicesRes.data ?? [];
  const memoryStats = memoryRes.data ?? [];
  const pipelineItemCount = pipelineCountRes.count ?? 0;
  const pipelineValues = pipelineValueRes.data ?? [];
  const pipelineTotalValue = pipelineValues.reduce(
    (sum: number, item: { metadata: Record<string, unknown> | null }) =>
      sum + Number((item.metadata as Record<string, unknown>)?.value ?? 0),
    0
  );
  const pendingMeetings = (pendingMeetingsRes.data ?? []) as Meeting[];
  const sponsorsTotal = (sponsorsCountRes as { count: number | null }).count ?? 0;
  const sponsorsConfirmedData = (sponsorsConfirmedRes.data ?? []) as { amount: number | null }[];
  const sponsorsConfirmed = sponsorsConfirmedData.length;
  const sponsorsConfirmedRevenue = sponsorsConfirmedData.reduce(
    (sum: number, s: { amount: number | null }) => sum + Number(s.amount ?? 0),
    0,
  );

  // Community growth delta
  const yesterdayMemberCount = yesterdayStatsRes.data?.member_count ?? null;
  const communityDelta =
    yesterdayMemberCount !== null && yesterdayMemberCount > 0 && communityMemberCount > 0
      ? Math.round(
          ((communityMemberCount - yesterdayMemberCount) / yesterdayMemberCount) * 100
        )
      : null;

  // --- KPI computations ---
  const activeTasks = tasks.filter((t) => t.status !== "done").length;
  const activeProjectIds = new Set(
    tasks.filter((t) => t.status !== "done").map((t) => t.project_id).filter(Boolean)
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

  const openInvoiceTotal = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount ?? 0),
    0
  );

  const memoryRecords = memoryStats.reduce(
    (sum: number, s: { count: number | null; record_count: number | null }) =>
      sum + (s.record_count ?? s.count ?? 0),
    0
  );

  // Build initial stats for KPIStripLive
  const initialStats: HomeStatsResponse = {
    activeTasks,
    activeProjectCount: activeProjectIds.size,
    totalContentPosts,
    contentDraftCount,
    contentScheduledCount,
    contentPublishedCount,
    contentThisWeek,
    contactsCount: totalContactsCount,
    conversationsCount: conversationsCountRes.count ?? 0,
    pipelineItemCount,
    pipelineTotalValue,
    openInvoiceTotal,
    memoryRecords,
    sponsorsTotal,
    sponsorsConfirmed,
    sponsorsConfirmedRevenue,
    overdueTasks: overdueTasksCountRes.count ?? 0,
    tasksCompletedToday: tasksCompletedTodayRes.count ?? 0,
    newContactsThisWeek: newContactsThisWeekRes.count ?? 0,
    lastUpdated: new Date().toISOString(),
  };

  // --- Ranked tasks (priority engine) ---
  const openTasks = (tasks as unknown as TaskWithProject[]).filter((t) => t.status !== "done");
  const rankedTasks = openTasks
    .map((task) => {
      const { score, factors } = scoreTask(task, task.projects);
      return { ...task, score, factors };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // --- Project summary cards ---
  type ProjectRow = (typeof projects)[number];
  type TaskRow = (typeof tasks)[number];

  const projectSummaries = projects.map((p: ProjectRow) => {
    const projectTasks = tasks.filter((t: TaskRow) => t.project_id === p.id);
    const openTasks = projectTasks.filter((t: TaskRow) => t.status !== "done");
    const upcoming = openTasks
      .sort((a: TaskRow, b: TaskRow) => {
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
      taskCount: openTasks.length,
      upcomingTasks: upcoming.map((t: TaskRow) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
      })),
    };
  });

  // Activity log entries
  const activityLogEntries = activityLogRes.data ?? [];

  // Upcoming items
  const overdueTasks = (overdueTasksRes.data ?? []) as { id: string; title: string; due_date: string; priority: string }[];
  const upcomingMeetings = (upcomingMeetingsRes.data ?? []) as { id: string; title: string; meeting_date: string | null }[];
  const scheduledContent = (scheduledContentRes.data ?? []) as { id: string; title: string | null; scheduled_for: string | null; platform: string | null }[];

  return (
    <div className="space-y-6">
      <DashboardRefreshListener />
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of tasks, content, contacts, and activity across all projects
        </p>
      </div>

      {/* 1. AI Focus Panel + Daily Briefing */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AIFocusPanelLive />
        <SessionPromptButton />
      </div>

      {/* 1b. Daily Briefing */}
      <DailyBriefingWidget />

      {/* 1c. Memory Health */}
      <MemoryHealthWidget />

      {/* 2. Quick Actions */}
      <QuickActionsBar />

      {/* 3. Post-Meeting Notifications */}
      <MeetingNotificationList meetings={pendingMeetings} />

      {/* 4. Module Health Overview */}
      <ModuleHealthOverview
        contactsCount={totalContactsCount}
        tasksCount={tasks.length}
        contentCount={allContent.length}
        pipelineCount={pipelineItemCount}
      />

      {/* 5. Live KPI Strip (auto-refresh 60s) */}
      <KPIStripLive
        initial={initialStats}
        communityMemberCount={communityMemberCount}
        communityDelta={communityDelta}
      />

      {/* 5b. Data Source Status */}
      <DataSourceStatus />

      {/* 6. Upcoming Items Panel */}
      <UpcomingItemsPanel
        meetings={upcomingMeetings}
        overdueTasks={overdueTasks}
        scheduledContent={scheduledContent}
      />

      {/* 7. Ranked Tasks */}
      <RankedTaskList initial={rankedTasks} />

      {/* 8. Content Calendar Preview */}
      <ContentCalendarPreview posts={allContent} />

      {/* 9. Project Summary Cards */}
      <ProjectSummaryCards projects={projectSummaries} />

      {/* 10. Live Activity Stream (auto-refresh 30s) */}
      <LiveActivityStream initial={activityLogEntries} />

      {/* 11. GitHub Activity */}
      <GitHubActivityCard />

      {/* 12. Telegram Bot Health */}
      <TelegramHealthCard />

      {/* 13. Memory Flush Prompt */}
      <MemoryFlushCard />
    </div>
  );
}
