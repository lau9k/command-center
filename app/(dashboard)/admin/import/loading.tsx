import { PageSkeleton, Skeleton } from "@/components/dashboard/LoadingSkeleton";

export default function ImportLoading() {
  return (
    <PageSkeleton>
      <div className="rounded-lg border border-dashed border-border bg-card p-12">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
    </PageSkeleton>
  );
}
