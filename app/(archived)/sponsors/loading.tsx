import { PageSkeleton, KPIStripSkeleton, KanbanSkeleton } from "@/components/skeletons";

export default function SponsorsLoading() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />
      <KanbanSkeleton columns={4} cardsPerColumn={3} />
    </PageSkeleton>
  );
}
