import {
  PageSkeleton,
  KPIStripSkeleton,
  TableSkeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function MemoryHealthLoading() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />
      <TableSkeleton rows={10} columns={6} />
    </PageSkeleton>
  );
}
