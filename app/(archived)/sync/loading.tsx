import { PageSkeleton, Skeleton, TableSkeleton } from "@/components/skeletons";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { ChartSkeleton } from "@/components/skeletons/ChartSkeleton";

export default function SyncLoading() {
  return (
    <PageSkeleton>
      <CardGridSkeleton cards={4} columns={4} />
      <ChartSkeleton charts={1} height="h-48" />
      <TableSkeleton rows={6} columns={5} />
    </PageSkeleton>
  );
}
