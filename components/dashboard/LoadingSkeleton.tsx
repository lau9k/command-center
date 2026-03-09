import { cn } from "@/lib/utils";

/** Base shimmer block */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted",
        className
      )}
      {...props}
    />
  );
}

/** KPI card skeleton — matches KpiCard layout */
function KPICardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/** Grid of KPI card skeletons */
function KPIStripSkeleton({ count = 8 }: { count?: number }) {
  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <KPICardSkeleton key={i} />
      ))}
    </section>
  );
}

/** Table skeleton with header + rows */
function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Header */}
      <div className="flex gap-4 border-b border-border bg-background px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 border-b border-border bg-card px-4 py-3 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Kanban board skeleton — 3 columns */
function KanbanSkeleton({ columns = 3, cardsPerColumn = 3 }: { columns?: number; cardsPerColumn?: number }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, colIdx) => (
        <div key={colIdx} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: cardsPerColumn }).map((_, cardIdx) => (
            <div
              key={cardIdx}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
            >
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card skeleton for project summary cards */
function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}

/** Full dashboard page skeleton */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      {/* AI Focus Panel */}
      <div className="flex items-start justify-between">
        <div className="flex-1 rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-2 h-3 w-64" />
        </div>
      </div>

      {/* Module Health */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-6 w-12" />
          </div>
        ))}
      </div>

      {/* KPI Strip */}
      <KPIStripSkeleton />

      {/* Content Calendar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>

      {/* Project Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Generic page skeleton with title + content area */
function PageSkeleton({ children }: { children?: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      {children ?? (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <TableSkeleton />
        </div>
      )}
    </div>
  );
}

/** Finance page skeleton */
function FinanceSkeleton() {
  return (
    <PageSkeleton>
      <KPIStripSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-48 w-full" />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-48 w-full" />
        </div>
      </div>
      <TableSkeleton rows={6} columns={5} />
    </PageSkeleton>
  );
}

export {
  Skeleton,
  KPICardSkeleton,
  KPIStripSkeleton,
  TableSkeleton,
  KanbanSkeleton,
  CardSkeleton,
  DashboardSkeleton,
  PageSkeleton,
  FinanceSkeleton,
};
