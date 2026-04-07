import {
  PageSkeleton,
  Skeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function WebhooksLoading() {
  return (
    <PageSkeleton>
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Test payload card */}
      <Skeleton className="h-48 w-full rounded-lg" />

      {/* Recent events list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </PageSkeleton>
  );
}
