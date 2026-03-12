import { PageSkeleton, Skeleton } from "@/components/skeletons";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";

export default function ProjectsLoading() {
  return (
    <PageSkeleton>
      {/* Search bar */}
      <Skeleton className="h-10 w-full" />
      <CardGridSkeleton cards={6} columns={3} />
    </PageSkeleton>
  );
}
