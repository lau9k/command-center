import { Skeleton } from "@/components/dashboard/LoadingSkeleton";

interface ChartSkeletonProps {
  /** Number of chart placeholder blocks */
  charts?: number;
  /** Height of each chart area */
  height?: string;
}

export function ChartSkeleton({ charts = 2, height = "h-64" }: ChartSkeletonProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: charts }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-4"
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className={`mt-4 w-full ${height}`} />
        </div>
      ))}
    </div>
  );
}
