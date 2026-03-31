import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import { getQueryClient } from "@/lib/query-client";
import { getAnalyticsSummary } from "@/lib/analytics/get-summary";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

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
    </HydrationBoundary>
  );
}
