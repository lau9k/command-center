import { PageSkeleton, KPIStripSkeleton, TableSkeleton } from "@/components/dashboard/LoadingSkeleton";

export default function ReimbursementsLoading() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />
      <TableSkeleton rows={5} columns={8} />
    </PageSkeleton>
  );
}
