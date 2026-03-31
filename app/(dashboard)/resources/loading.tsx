import {
  PageSkeleton,
  KPIStripSkeleton,
  Skeleton,
} from "@/components/dashboard/LoadingSkeleton";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";

export default function ResourcesLoading() {
  return (
    <PageSkeleton>
      {/* KPI strip */}
      <KPIStripSkeleton count={3} />

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[140px]" />
        <Skeleton className="h-10 w-[160px]" />
        <Skeleton className="h-10 w-[150px]" />
      </div>

      {/* Card grid */}
      <CardGridSkeleton cards={8} columns={4} />
    </PageSkeleton>
  );
}
