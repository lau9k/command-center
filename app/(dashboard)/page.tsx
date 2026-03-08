import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { AIFocusPanel } from "@/components/dashboard/AIFocusPanel";
import { SessionPromptButton } from "@/components/dashboard/SessionPromptButton";
import { KPIStrip } from "@/components/dashboard/KPIStrip";
import { ProjectSummaryCards } from "@/components/dashboard/ProjectSummaryCards";
import { ContentCalendarPreview } from "@/components/dashboard/ContentCalendarPreview";
import {
  RecentActivityFeed,
  type ActivityItem,
} from "@/components/dashboard/RecentActivityFeed";
import type { ContentPost } from "@/lib/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // Parallel data fetching for all KPI + section data
  // Fetch community member count from Telegram API (non-blocking)
  async function fetchCommunityMemberCount(): Promise<number | null> {
    try {
      const token = process.env.MEEK_COMMUNITY_BOT_TOKEN;
      const chatId = process.env.MEEK_COMMUNITY_CHAT_ID || "-1003661922248";
      if (!token) return null;

      const res = await fetch(
        `https://api.telegram.org/bot${token}/getChatMemberCount`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId }),
          next: { revalidate: 300 },
        }
      );
      const data = await res.json();
      return data.ok ? data.result : null;
    } catch {
      return null;
    }
  }

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
    communityMemberCount,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, project_id, title, status, priority, due_date, updated_at, projects(id, name, slug, color, status)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name, slug, status")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("content_posts")
      .select("id, project_id, title, scheduled_for, updated_at, projects(id, name, color)")
      .order("updated_at", { ascending: false }),
    serviceClient
      .from("content_posts")
      .select("id, status, scheduled_at, scheduled_for, platforms, platform, project_id, title, caption")
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .returns<ContentPost[]>(),
    supabase.from("contacts").select("id, project_id, name, updated_at, projects(id, name, color)").order("updated_at", { ascending: false }),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase
      .from("invoices")
      .select("amount, status")
      .in("status", ["sent", "overdue"]),
    supabase.from("memory_stats").select("count"),
    supabase.from("pipeline_items").select("id", { count: "exact", head: true }),
    fetchCommunityMemberCount(),
  ]);

  const tasks = tasksRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const contentPosts = contentRes.data ?? [];
  const allContent = (allContentRes.data ?? []) as ContentPost[];
  const contacts = contactsRes.data ?? [];
  const totalContactsCount = contactsCountRes.count ?? 0;
  const invoices = invoicesRes.data ?? [];
  const memoryStats = memoryRes.data ?? [];
  const pipelineItemCount = pipelineCountRes.count ?? 0;

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

      {/* 2. KPI Strip */}
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
        communityMemberCount={communityMemberCount}
      />

      {/* 3. Content Calendar Preview */}
      <ContentCalendarPreview posts={allContent} />

      {/* 4. Project Summary Cards */}
      <ProjectSummaryCards projects={projectSummaries} />

      {/* 5. Recent Activity Feed */}
      <RecentActivityFeed items={recentActivity} />
    </div>
  );
}
