import {
  PageSkeleton,
  KPIStripSkeleton,
  Skeleton,
  TableSkeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function ContactsLoading() {
  return (
    <PageSkeleton>
      {/* KPI strip */}
      <KPIStripSkeleton count={4} />

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Table */}
      <TableSkeleton rows={8} columns={6} />
    </PageSkeleton>
  );
}
