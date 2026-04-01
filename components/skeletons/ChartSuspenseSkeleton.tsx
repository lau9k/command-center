import { Skeleton } from "@/components/dashboard/LoadingSkeleton";

interface ChartSuspenseSkeletonProps {
  /** Height class for the chart area */
  height?: string;
  /** Whether to show a mock Y-axis */
  showYAxis?: boolean;
}

/**
 * Skeleton placeholder for Recharts chart components.
 * Renders a pulsing rectangle with faux axis lines.
 */
export function ChartSuspenseSkeleton({
  height = "h-[260px]",
  showYAxis = true,
}: ChartSuspenseSkeletonProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Title placeholder */}
      <Skeleton className="h-5 w-36" />

      <div className="relative mt-4 flex gap-2">
        {/* Y-axis ticks */}
        {showYAxis && (
          <div className="flex flex-col justify-between py-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        )}

        {/* Chart area */}
        <div className={`flex-1 ${height}`}>
          {/* Grid lines */}
          <div className="flex h-full flex-col justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-px w-full bg-border opacity-40"
              />
            ))}
          </div>
          {/* Pulsing chart body overlay */}
          <Skeleton className={`absolute inset-x-0 bottom-0 ${showYAxis ? "left-12" : "left-0"} right-0 ${height} rounded opacity-50`} />
        </div>
      </div>

      {/* X-axis labels */}
      <div className="mt-2 flex justify-between px-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-10" />
        ))}
      </div>
    </div>
  );
}
