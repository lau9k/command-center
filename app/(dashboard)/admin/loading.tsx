import {
  PageSkeleton,
  Skeleton,
  CardSkeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function AdminLoading() {
  return (
    <PageSkeleton>
      {/* Seed runner card */}
      <CardSkeleton />

      {/* Health check card */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </PageSkeleton>
  );
}
