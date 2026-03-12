import { Skeleton, CardSkeleton } from "@/components/dashboard/LoadingSkeleton";

interface CardGridSkeletonProps {
  cards?: number;
  columns?: 2 | 3 | 4;
}

const colsClass = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
} as const;

export function CardGridSkeleton({ cards = 6, columns = 3 }: CardGridSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${colsClass[columns]}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
