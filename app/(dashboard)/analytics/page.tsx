import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import { getQueryClient } from "@/lib/query-client";
import { getAnalyticsSummary } from "@/lib/analytics/get-summary";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import AnalyticsOverview from "@/components/analytics/AnalyticsOverview";

export const dynamic = "force-dynamic";

const DEFAULT_PERIOD = "30d";

export default async function AnalyticsPage() {
  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["analytics", DEFAULT_PERIOD],
    queryFn: () => getAnalyticsSummary(supabase, DEFAULT_PERIOD, true),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AnalyticsDashboard />
      <div className="px-6 pb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Cross-Module Overview
          </h2>
          <p className="text-sm text-muted-foreground">
            KPI charts across contacts, pipeline, tasks, and sync health.
          </p>
        </div>
        <AnalyticsOverview />
      </div>
    </HydrationBoundary>
  );
}
