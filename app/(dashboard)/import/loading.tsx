import { PageSkeleton, Skeleton, TableSkeleton } from "@/components/skeletons";

export default function ImportLoading() {
  return (
    <PageSkeleton>
      {/* Upload area */}
      <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-border bg-card">
        <Skeleton className="h-6 w-48" />
      </div>
      <TableSkeleton rows={5} columns={4} />
    </PageSkeleton>
  );
}
