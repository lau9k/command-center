import {
  PageSkeleton,
  KPIStripSkeleton,
  Skeleton,
  TableSkeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function TasksLoading() {
  return (
    <PageSkeleton>
      {/* KPI strip */}
      <KPIStripSkeleton count={4} />

      {/* Quick-add bar */}
      <Skeleton className="h-10 w-full" />

      {/* Filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Table */}
      <TableSkeleton rows={8} columns={6} />
    </PageSkeleton>
  );
}
