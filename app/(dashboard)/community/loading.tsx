import { PageSkeleton, KPIStripSkeleton, Skeleton } from "@/components/skeletons";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";

export default function CommunityLoading() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Members section */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <CardGridSkeleton cards={6} columns={2} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
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

          <div className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-4 h-40 w-full" />
          </div>
        </div>
      </div>
    </PageSkeleton>
  );
}
