import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton matching exact KpiCard layout: label + icon row, value, subtitle, optional delta */
function KpiCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      {/* Label + icon row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      {/* Value + subtitle */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

/** Grid of KPI card skeletons matching the KPIStripLive grid */
function KpiStripSkeleton({ count = 13 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}

export { KpiCardSkeleton, KpiStripSkeleton };
