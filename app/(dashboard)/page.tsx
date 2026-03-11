import { createServiceClient } from "@/lib/supabase/service";
import { fetchCommunityMemberCount } from "@/lib/telegram/community";
import { AIFocusPanel } from "@/components/dashboard/AIFocusPanel";
import { SessionPromptButton } from "@/components/dashboard/SessionPromptButton";
import { KPIStrip } from "@/components/dashboard/KPIStrip";
import { ProjectSummaryCards } from "@/components/dashboard/ProjectSummaryCards";
import { ContentCalendarPreview } from "@/components/dashboard/ContentCalendarPreview";
import {
  RecentActivityFeed,
  type ActivityItem,
} from "@/components/dashboard/RecentActivityFeed";
import { ModuleHealthOverview } from "@/components/dashboard/ModuleHealthOverview";
import { MemoryFlushCard } from "@/components/dashboard/MemoryFlushCard";
import { TelegramHealthCard } from "@/components/dashboard/TelegramHealthCard";
import { GitHubActivityCard } from "@/components/dashboard/GitHubActivityCard";
import { DashboardRefreshListener } from "@/components/dashboard/DashboardRefreshListener";
import { MeetingNotificationList } from "@/components/meetings/meeting-notification";
import type { ContentPost, Meeting } from "@/lib/types/database";

export const dynamic = "force-dynamic";

function getYesterdayISO(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export default async function DashboardPage() {
  const yesterday = getYesterdayISO();
  const serviceClient = createServiceClient();

  // Parallel data fetching for all KPI + section data
  const [
    tasksRes,
    projectsRes,
    contentRes,
    allContentRes,
    contactsRes,
    contactsCountRes,
    invoicesRes,
    memoryRes,
    pipelineCountRes,
    pipelineValueRes,
    communityMemberCount,
    pendingMeetingsRes,
    yesterdayStatsRes,
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
    serviceClient.from("contacts").select("id, project_id, name, updated_at, projects(id, name, color)").order("updated_at", { ascending: false }),
    serviceClient.from("contacts").select("id", { count: "exact", head: true }),
    serviceClient
      .from("invoices")
      .select("amount, status")
      .in("status", ["sent", "overdue"]),
    serviceClient.from("memory_stats").select("count"),
    serviceClient.from("pipeline_items").select("id", { count: "exact", head: true }),
    serviceClient
      .from("pipeline_items")
      .select("value")
      .neq("stage", "closed-lost"),
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
  ]);

  // Log query errors server-side for debugging KPI issues
  const queryResults = [
    { name: "tasks", error: tasksRes.error },
    { name: "projects", error: projectsRes.error },
    { name: "content_posts", error: contentRes.error },
    { name: "all_content", error: allContentRes.error },
    { name: "contacts", error: contactsRes.error },
    { name: "contacts_count", error: contactsCountRes.error, count: contactsCountRes.count },
    { name: "invoices", error: invoicesRes.error },
    { name: "memory_stats", error: memoryRes.error },
    { name: "pipeline_count", error: pipelineCountRes.error, count: pipelineCountRes.count },
    { name: "pipeline_value", error: pipelineValueRes.error },
    { name: "pending_meetings", error: pendingMeetingsRes.error },
  ];

  for (const q of queryResults) {
    if (q.error) {
      console.error(`[Dashboard KPI] ${q.name} query error:`, q.error.message);
    }
  }

  const tasks = tasksRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const contentPosts = contentRes.data ?? [];
  const allContent = (allContentRes.data ?? []) as ContentPost[];
  const contacts = contactsRes.data ?? [];
  const totalContactsCount = contactsCountRes.count ?? 0;
  const invoices = invoicesRes.data ?? [];
  const memoryStats = memoryRes.data ?? [];
  const pipelineItemCount = pipelineCountRes.count ?? 0;
  const pipelineValues = pipelineValueRes.data ?? [];
  const pipelineTotalValue = pipelineValues.reduce(
    (sum: number, item: { value: number | null }) => sum + Number(item.value ?? 0),
    0
  );
  const pendingMeetings = (pendingMeetingsRes.data ?? []) as Meeting[];

  // Community growth delta: compare live count to yesterday's cached value
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

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const contentThisWeek = contentPosts.filter((p) => {
    if (!p.scheduled_for) return false;
    const d = new Date(p.scheduled_for);
    return d >= now && d <= weekFromNow;
  }).length;

  // Content status breakdown
  const totalContentPosts = allContent.length;
  const contentDraftCount = allContent.filter((p) => p.status === "draft").length;
  const contentScheduledCount = allContent.filter((p) => p.status === "scheduled").length;
  const contentPublishedCount = allContent.filter((p) => p.status === "published").length;

  const openInvoiceTotal = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount ?? 0),
    0
  );

  const memoryRecords = memoryStats.reduce(
    (sum, s) => sum + (s.count ?? 0),
    0
  );

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

  // --- Recent activity feed (last 10 items across tasks/content/contacts) ---
  type ProjectRef = { name: string; color: string | null };
  function extractProject(raw: unknown): ProjectRef | null {
    if (!raw) return null;
    const obj = (Array.isArray(raw) ? raw[0] : raw) as ProjectRef | undefined;
    return obj ?? null;
  }

  const activityItems: ActivityItem[] = [];

  for (const t of tasks.slice(0, 10)) {
    const proj = extractProject(t.projects);
    activityItems.push({
      id: t.id,
      type: "task",
      title: t.title,
      projectName: proj?.name ?? null,
      projectColor: proj?.color ?? null,
      updatedAt: t.updated_at,
      href: `/tasks`,
    });
  }

  for (const c of contentPosts.slice(0, 10)) {
    const proj = extractProject(c.projects);
    activityItems.push({
      id: c.id,
      type: "content",
      title: c.title ?? "Untitled post",
      projectName: proj?.name ?? null,
      projectColor: proj?.color ?? null,
      updatedAt: c.updated_at,
      href: `/content`,
    });
  }

  for (const ct of contacts.slice(0, 10)) {
    const proj = extractProject(ct.projects);
    activityItems.push({
      id: ct.id,
      type: "contact",
      title: ct.name,
      projectName: proj?.name ?? null,
      projectColor: proj?.color ?? null,
      updatedAt: ct.updated_at,
      href: `/contacts`,
    });
  }

  // Sort all by updated_at desc, take top 10
  activityItems.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const recentActivity = activityItems.slice(0, 10);

  return (
    <div className="space-y-6">
      <DashboardRefreshListener />
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of tasks, content, contacts, and activity across all projects
        </p>
      </div>

      {/* 1. AI Focus Panel */}
      <div className="flex items-start justify-between">
        <AIFocusPanel />
        <SessionPromptButton />
      </div>

      {/* 2. Post-Meeting Notifications */}
      <MeetingNotificationList meetings={pendingMeetings} />

      {/* 3. Module Health Overview */}
      <ModuleHealthOverview
        contactsCount={totalContactsCount}
        tasksCount={tasks.length}
        contentCount={allContent.length}
        pipelineCount={pipelineItemCount}
      />

      {/* 3. KPI Strip */}
      <KPIStrip
        activeTasks={activeTasks}
        activeProjectCount={activeProjectIds.size}
        contentThisWeek={contentThisWeek}
        contactsCount={totalContactsCount}
        openInvoiceTotal={openInvoiceTotal}
        memoryRecords={memoryRecords}
        totalContentPosts={totalContentPosts}
        contentDraftCount={contentDraftCount}
        contentScheduledCount={contentScheduledCount}
        contentPublishedCount={contentPublishedCount}
        pipelineItemCount={pipelineItemCount}
        pipelineTotalValue={pipelineTotalValue}
        communityMemberCount={communityMemberCount}
        communityDelta={communityDelta}
      />

      {/* 4. Content Calendar Preview */}
      <ContentCalendarPreview posts={allContent} />

      {/* 5. Project Summary Cards */}
      <ProjectSummaryCards projects={projectSummaries} />

      {/* 6. Recent Activity Feed */}
      <RecentActivityFeed items={recentActivity} />

      {/* 7. GitHub Activity */}
      <GitHubActivityCard />

      {/* 8. Telegram Bot Health */}
      <TelegramHealthCard />

      {/* 9. Memory Flush Prompt */}
      <MemoryFlushCard />
    </div>
  );
}
