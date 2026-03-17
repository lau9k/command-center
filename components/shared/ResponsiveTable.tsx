"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  /** Hide this column on mobile card view (still shows in table scroll mode) */
  hideOnMobile?: boolean;
  /** Label override for card mode */
  cardLabel?: string;
}

interface ResponsiveTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  /** "scroll" keeps table with horizontal scroll, "card" renders stacked cards on mobile */
  mobileMode?: "scroll" | "card";
  /** Field IDs to show as the card title (first match used) */
  cardTitleField?: string;
  className?: string;
  rowKey?: (row: T, index: number) => string | number;
}

function ResponsiveTable<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data available",
  mobileMode = "card",
  cardTitleField,
  className,
  rowKey,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-card p-12 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const titleCol = cardTitleField
    ? columns.find((c) => c.id === cardTitleField)
    : columns[0];

  const detailCols = columns.filter((c) => c.id !== titleCol?.id && !c.hideOnMobile);

  function getCellValue(col: ColumnDef<T>, row: T): React.ReactNode {
    if (col.cell) return col.cell(row);
    if (col.accessorKey) return String(row[col.accessorKey] ?? "");
    return null;
  }

  return (
    <div className={cn("max-w-full overflow-hidden", className)}>
      {/* Desktop/tablet: scrollable table */}
      <div className={cn(
        "overflow-hidden rounded-lg border border-border",
        mobileMode === "card" ? "hidden md:block" : "block"
      )}>
        <div className="-mx-px overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={rowKey ? rowKey(row, idx) : idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-border bg-card transition-colors last:border-b-0",
                    onRowClick && "cursor-pointer",
                    "hover:bg-accent"
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.id} className="px-4 py-3 text-foreground">
                      {getCellValue(col, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: card mode */}
      {mobileMode === "card" && (
        <div className="space-y-3 md:hidden">
          {data.map((row, idx) => (
            <div
              key={rowKey ? rowKey(row, idx) : idx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "rounded-lg border border-border bg-card p-4",
                onRowClick && "min-h-[44px] cursor-pointer active:bg-accent"
              )}
            >
              {titleCol && (
                <div className="mb-2 text-sm font-medium text-foreground">
                  {getCellValue(titleCol, row)}
                </div>
              )}
              <div className="space-y-1">
                {detailCols.map((col) => (
                  <div key={col.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {col.cardLabel ?? col.header}
                    </span>
                    <span className="text-foreground">
                      {getCellValue(col, row)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { ResponsiveTable };
export type { ResponsiveTableProps, ColumnDef as ResponsiveColumnDef };
