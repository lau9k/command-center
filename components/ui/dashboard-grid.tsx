import { cn } from "@/lib/utils";

type Columns = 1 | 2 | 3 | 4;

const colsMap: Record<Columns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

interface DashboardGridProps {
  children: React.ReactNode;
  /** Maximum number of columns at the widest breakpoint (default: 3) */
  columns?: Columns;
  className?: string;
}

export function DashboardGrid({
  children,
  columns = 3,
  className,
}: DashboardGridProps) {
  return (
    <div className={cn("grid gap-4", colsMap[columns], className)}>
      {children}
    </div>
  );
}
