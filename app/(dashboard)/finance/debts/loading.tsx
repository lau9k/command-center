import { PageSkeleton, KPIStripSkeleton, CardSkeleton } from "@/components/dashboard/LoadingSkeleton";

export default function DebtsLoading() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </PageSkeleton>
  );
}
