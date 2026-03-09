import { PageSkeleton, Skeleton } from "@/components/dashboard/LoadingSkeleton";

export default function SettingsLoading() {
  return (
    <PageSkeleton>
      <div className="space-y-6">
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-10 w-48" />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
      </div>
    </PageSkeleton>
  );
}
