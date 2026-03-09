import { PageSkeleton, KanbanSkeleton } from "@/components/dashboard/LoadingSkeleton";

export default function ContentLoading() {
  return (
    <PageSkeleton>
      <KanbanSkeleton columns={4} cardsPerColumn={3} />
    </PageSkeleton>
  );
}
