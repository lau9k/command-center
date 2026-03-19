import { PageSkeleton, Skeleton, TableSkeleton } from "@/components/skeletons";

export default function WebhooksLoading() {
  return (
    <PageSkeleton>
      {/* Filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>
      <TableSkeleton rows={8} columns={5} />
    </PageSkeleton>
  );
}
