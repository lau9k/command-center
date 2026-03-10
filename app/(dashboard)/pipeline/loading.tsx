import {
  PageSkeleton,
  KPIStripSkeleton,
  KanbanSkeleton,
} from "@/components/dashboard/LoadingSkeleton";

export default function PipelineLoading() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />
      <KanbanSkeleton columns={4} cardsPerColumn={3} />
    </PageSkeleton>
  );
}
