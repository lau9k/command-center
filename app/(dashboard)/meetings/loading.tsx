import { PageSkeleton, Skeleton, TableSkeleton } from "@/components/skeletons";

export default function MeetingsLoading() {
  return (
    <PageSkeleton>
      {/* Search + filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-36" />
      </div>
      <TableSkeleton rows={8} columns={5} />
    </PageSkeleton>
  );
}
