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
import { OutreachFunnelCard } from "@/components/dashboard/OutreachFunnelCard";
import { FinanceSummaryWidget } from "@/components/home/FinanceSummaryWidget";

import { getHomeStats } from "@/app/api/home-stats/route";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getHomeStats();

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
