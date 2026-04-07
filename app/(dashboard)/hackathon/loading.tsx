import {
  PageSkeleton,
  KPIStripSkeleton,
  Skeleton,
  TableSkeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function HackathonLoading() {
  return (
    <PageSkeleton>
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Check-in stats */}
      <KPIStripSkeleton count={2} />

      {/* Check-in list */}
      <TableSkeleton rows={8} columns={4} />
    </PageSkeleton>
  );
}
