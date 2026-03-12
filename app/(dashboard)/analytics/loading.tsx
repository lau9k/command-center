import { PageSkeleton, KPIStripSkeleton } from "@/components/skeletons";
import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";

export default function AnalyticsLoading() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />
      <ChartSkeleton charts={2} height="h-64" />
      <ChartSkeleton charts={2} height="h-48" />
    </PageSkeleton>
  );
}
