import { PageSkeleton, KPIStripSkeleton, Skeleton } from "@/components/dashboard/LoadingSkeleton";

export default function ForecastLoading() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />
      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-[400px] w-full" />
      </div>
    </PageSkeleton>
  );
}
