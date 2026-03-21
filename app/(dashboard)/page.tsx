import { TodaysFocusWidget } from "@/components/home/TodaysFocusWidget";
import type { FocusTask, StaleContact } from "@/components/home/TodaysFocusWidget";
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
import { OutreachFunnelCard } from "@/components/dashboard/OutreachFunnelCard";
import { FinanceSummaryWidget } from "@/components/home/FinanceSummaryWidget";
import { FollowUpSuggestions } from "@/components/home/FollowUpSuggestions";

import { getHomeStats } from "@/app/api/home-stats/route";
import { createServiceClient } from "@/lib/supabase/service";
import type { TaskPriority } from "@/lib/types/database";

export const dynamic = "force-dynamic";

async function getTodaysFocusData() {
  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const [overdueRes, dueTodayRes, staleRes] = await Promise.all([
    // Overdue: due_date < today AND status != done
    supabase
      .from("tasks")
      .select("id, title, priority, due_date, projects(name, color)")
      .lt("due_date", today)
      .neq("status", "done")
      .order("due_date", { ascending: true })
      .limit(5),

    // Due today: due_date = today AND status != done
    supabase
      .from("tasks")
      .select("id, title, priority, due_date, projects(name, color)")
      .eq("due_date", today)
      .neq("status", "done")
      .order("priority", { ascending: true })
      .limit(5),

    // Stale contacts: last_contact_date <= 7 days ago, tagged Personize or Hackathon
    supabase
      .from("contacts")
      .select("id, name, company, last_contact_date, tags")
      .lte("last_contact_date", sevenDaysAgo)
      .overlaps("tags", ["Personize", "Hackathon"])
      .order("last_contact_date", { ascending: true })
      .limit(5),
  ]);

  const mapTask = (row: Record<string, unknown>): FocusTask => {
    const proj = row.projects as { name: string; color: string | null } | null;
    return {
      id: row.id as string,
      title: row.title as string,
      priority: row.priority as TaskPriority,
      due_date: (row.due_date as string) ?? null,
      project_name: proj?.name ?? null,
      project_color: proj?.color ?? null,
    };
  };

  const overdueTasks: FocusTask[] = (overdueRes.data ?? []).map(mapTask);
  const dueTodayTasks: FocusTask[] = (dueTodayRes.data ?? []).map(mapTask);

  const staleContacts: StaleContact[] = (staleRes.data ?? []).map((row) => {
    const lastDate = row.last_contact_date as string | null;
    const daysSince = lastDate
      ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86_400_000)
      : 999;
    const tags = (row.tags as string[]) ?? [];
    const tag = tags.includes("Personize") ? "Personize" : tags.includes("Hackathon") ? "Hackathon" : tags[0] ?? "";
    return {
      id: row.id as string,
      name: row.name as string,
      company: (row.company as string) ?? null,
      days_since_contact: daysSince,
      tag,
    };
  });

  return { overdueTasks, dueTodayTasks, staleContacts };
}

export default async function DashboardPage() {
  const [stats, focusData] = await Promise.all([
    getHomeStats(),
    getTodaysFocusData(),
  ]);

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <DashboardRefreshListener />
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of tasks, content, contacts, and activity across all projects
        </p>
      </div>

      {/* 1. Today's Focus + Session Prompt */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <TodaysFocusWidget
          overdueTasks={focusData.overdueTasks}
          dueTodayTasks={focusData.dueTodayTasks}
          staleContacts={focusData.staleContacts}
        />
        <SessionPromptButton />
      </div>

      {/* 1b. Follow-Up Suggestions (Personize-powered) */}
      <FollowUpSuggestions />

      {/* 1c. Daily Briefing */}
      <DailyBriefingWidget />

      {/* 1d. Memory Health */}
      <MemoryHealthWidget />

      {/* 2. Quick Actions */}
      <QuickActionsBar />

      {/* 3. Post-Meeting Notifications */}
      <MeetingNotificationList meetings={stats.pendingMeetings} />

      {/* 4. Module Health Overview */}
      <ModuleHealthOverview
        contactsCount={stats.contactsCount}
        tasksCount={stats.totalTasksCount}
        contentCount={stats.totalContentPosts}
        pipelineCount={stats.pipelineItemCount}
      />

      {/* 5. Live KPI Strip (auto-refresh 60s) */}
      <KPIStripLive
        initial={stats}
        communityMemberCount={stats.communityMemberCount}
        communityDelta={stats.communityDelta}
      />

      {/* 5b. Outreach Funnel + Finance Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <OutreachFunnelCard stats={stats.outreachStats} />
        <FinanceSummaryWidget />
      </div>

      {/* 6. Upcoming Items Panel */}
      <UpcomingItemsPanel
        meetings={stats.upcomingMeetings}
        overdueTasks={stats.overdueTasksList}
        scheduledContent={stats.scheduledContent}
      />

      {/* 7. Ranked Tasks */}
      <RankedTaskList initial={stats.rankedTasks} />

      {/* 8. Content Calendar Preview */}
      <ContentCalendarPreview posts={stats.allContent} />

      {/* 9. Project Summary Cards */}
      <ProjectSummaryCards projects={stats.projectSummaries} />

      {/* 10. Live Activity Stream (auto-refresh 30s) */}
      <LiveActivityStream initial={stats.activityLog} />

      {/* 11. GitHub Activity */}
      <GitHubActivityCard />

      {/* 12. Telegram Bot Health */}
      <TelegramHealthCard />

      {/* 13. Memory Flush Prompt */}
      <MemoryFlushCard />
    </div>
  );
}
