import {
  PageSkeleton,
  KPIStripSkeleton,
  Skeleton,
  TableSkeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function ContactsLoading() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />

      {/* Search & Filter Bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-28" />
      </div>

      <TableSkeleton rows={8} columns={6} />
    </PageSkeleton>
  );
}
