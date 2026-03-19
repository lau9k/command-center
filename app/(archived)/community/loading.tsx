import {
  PageSkeleton,
  KPIStripSkeleton,
  Skeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function CommunityLoading() {
  return (
    <PageSkeleton>
      {/* KPI strip */}
      <KPIStripSkeleton count={4} />

      {/* Main content: members grid + sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Members section (2/3) */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Search bar */}
          <Skeleton className="h-10 w-full rounded-md" />

          {/* Member cards grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar (1/3) */}
        <div className="flex flex-col gap-6">
          {/* Activity feed */}
          <div className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-5 w-28" />
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Growth chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-4 h-40 w-full" />
          </div>
        </div>
      </div>
    </PageSkeleton>
  );
}
