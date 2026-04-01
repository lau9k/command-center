import { KPICards, buildKPIData } from "@/components/home/KPICards";
import { QuickActions } from "@/components/home/QuickActions";
import { RecentActivityFeed } from "@/components/home/RecentActivityFeed";
import { WidgetErrorBoundary } from "@/components/shared/WidgetErrorBoundary";
import { DashboardRefreshListener } from "@/components/dashboard/DashboardRefreshListener";

import { getHomeStats } from "@/app/api/home-stats/route";

export const dynamic = "force-dynamic";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const stats = await getHomeStats();

  const kpiData = buildKPIData({
    contactsCount: stats.contactsCount,
    pipelineItemCount: stats.pipelineItemCount,
    pipelineTotalValue: stats.pipelineTotalValue,
    activeTasks: stats.activeTasks,
    contentScheduledCount: stats.contentScheduledCount,
    upcomingMeetings: stats.upcomingMeetings,
  });

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <DashboardRefreshListener />

      {/* Greeting Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground dark:text-foreground">
          {getGreeting()}, Lautaro
        </h1>
        <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
          {formatDate()}
          <span className="mx-2">&middot;</span>
          <span>
            Last sync{" "}
            {new Date(stats.lastUpdated).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </p>
      </div>

      {/* KPI Cards */}
      <WidgetErrorBoundary name="KPI Cards">
        <KPICards initial={kpiData} />
      </WidgetErrorBoundary>

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Activity Feed */}
      <WidgetErrorBoundary name="Recent Activity">
        <RecentActivityFeed initial={stats.activityLog} />
      </WidgetErrorBoundary>
    </div>
  );
}
