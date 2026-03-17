import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveGridProps extends React.ComponentProps<"div"> {
  /** Number of columns at each breakpoint. Defaults: mobile=1, sm=2, lg=3, xl=4 */
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  /** Gap between items — maps to Tailwind gap utilities. Default: 4 */
  gap?: number;
  children: React.ReactNode;
}

const colClasses: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const smColClasses: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};

const mdColClasses: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

const lgColClasses: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

const xlColClasses: Record<number, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};

const gapClasses: Record<number, string> = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
};

function ResponsiveGrid({
  cols,
  gap = 4,
  className,
  children,
  ...props
}: ResponsiveGridProps) {
  const defaultCols = cols?.default ?? 1;
  const sm = cols?.sm ?? 2;
  const lg = cols?.lg ?? 3;
  const xl = cols?.xl ?? 4;

  return (
    <div
      className={cn(
        "grid",
        gapClasses[gap] ?? "gap-4",
        colClasses[defaultCols] ?? "grid-cols-1",
        smColClasses[sm] ?? "sm:grid-cols-2",
        cols?.md != null && (mdColClasses[cols.md] ?? undefined),
        lgColClasses[lg] ?? "lg:grid-cols-3",
        xlColClasses[xl] ?? "xl:grid-cols-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { ResponsiveGrid };
export type { ResponsiveGridProps };
