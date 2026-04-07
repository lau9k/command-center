import {
  PageSkeleton,
  Skeleton,
  TableSkeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function SponsorsLoading() {
  return (
    <PageSkeleton>
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Sponsors table */}
      <TableSkeleton rows={6} columns={5} />
    </PageSkeleton>
  );
}
