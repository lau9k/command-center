import { PageSkeleton, KPIStripSkeleton, TableSkeleton } from "@/components/dashboard/LoadingSkeleton";

export default function TreasuryLoading() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />
      <TableSkeleton rows={6} columns={6} />
    </PageSkeleton>
  );
}
