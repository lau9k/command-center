import { Skeleton } from "@/components/dashboard/LoadingSkeleton";

interface DataTableSkeletonProps {
  /** Number of data rows (excluding header) */
  rows?: number;
  /** Number of columns */
  columns?: number;
}

/**
 * Skeleton placeholder for data table components.
 * Renders a header row with heavier shading + pulsing content rows.
 */
export function DataTableSkeleton({
  rows = 5,
  columns = 5,
}: DataTableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Toolbar area */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Header row */}
      <div className="flex gap-4 border-b border-border bg-background px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 border-b border-border bg-card px-4 py-3 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className={`h-4 flex-1 ${colIdx === 0 ? "max-w-[180px]" : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
