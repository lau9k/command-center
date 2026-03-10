import {
  PageSkeleton,
  KPIStripSkeleton,
  Skeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function TasksLoading() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />

      {/* Quick-add bar */}
      <Skeleton className="h-10 w-full" />

      {/* Search & Filters */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Task cards */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
          >
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </PageSkeleton>
  );
}
