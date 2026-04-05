import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { KPICards } from "@/components/home/KPICards";
import { buildKPIData } from "@/lib/kpi-data";
import { QuickActions } from "@/components/home/QuickActions";
import { RecentActivityFeed } from "@/components/home/RecentActivityFeed";
import { WidgetErrorBoundary } from "@/components/shared/WidgetErrorBoundary";
import { DataSourceSummaryBar } from "@/components/home/data-source-status";
import { DashboardRefreshListener } from "@/components/dashboard/DashboardRefreshListener";
import { getQueryClient } from "@/lib/query-client";
import { getHomeStats } from "@/app/api/home-stats/route";
import { homeStatsOptions } from "@/lib/queries/home";
import type { HomeStatsResponse } from "@/app/api/home-stats/route";

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
  const queryClient = getQueryClient();
  const { queryKey, staleTime } = homeStatsOptions();

  await queryClient.prefetchQuery({
    queryKey,
    queryFn: getHomeStats,
    staleTime,
  });

  const stats = queryClient.getQueryData<HomeStatsResponse>(queryKey)!;

  const kpiData = buildKPIData({
    contactsCount: stats.contactsCount,
    pipelineItemCount: stats.pipelineItemCount,
    pipelineTotalValue: stats.pipelineTotalValue,
    activeTasks: stats.activeTasks,
    contentScheduledCount: stats.contentScheduledCount,
    upcomingMeetings: stats.upcomingMeetings,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
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

        {/* Data Source Summary */}
        <DataSourceSummaryBar
          contactsSource={stats.contacts_source}
          lastUpdated={stats.lastUpdated}
          degraded={stats?._meta?.degraded ?? false}
          degradedReason={stats?._meta?.reason}
        />

        {/* Quick Actions */}
        <QuickActions />

        {/* Recent Activity Feed */}
        <WidgetErrorBoundary name="Recent Activity">
          <RecentActivityFeed initial={stats.activityLog} />
        </WidgetErrorBoundary>
      </div>
    </HydrationBoundary>
  );
}
