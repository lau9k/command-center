import { PageSkeleton, Skeleton } from "@/components/skeletons";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";

export default function TemplatesLoading() {
  return (
    <PageSkeleton>
      {/* Search + filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-36" />
      </div>
      <CardGridSkeleton cards={6} columns={3} />
    </PageSkeleton>
  );
}
