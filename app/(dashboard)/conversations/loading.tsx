import {
  PageSkeleton,
  KPIStripSkeleton,
  Skeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function ConversationsLoading() {
  return (
    <PageSkeleton>
      {/* KPI strip */}
      <KPIStripSkeleton count={4} />

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Conversation cards */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </PageSkeleton>
  );
}
