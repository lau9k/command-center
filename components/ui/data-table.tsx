"use client"

import * as React from "react"
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

// --- Column Definition ---

interface ColumnDef<T> {
  id: string
  header: string
  accessorKey?: keyof T
  cell?: (row: T) => React.ReactNode
  sortable?: boolean
}

// --- DataTable Props ---

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  selectable?: boolean
  selectedRows?: Set<number>
  onSelectionChange?: (selected: Set<number>) => void
  emptyMessage?: string
  pageSize?: number
  className?: string
  rowKey?: (row: T, index: number) => string | number
}

function DataTable<T>({
  columns,
  data,
  onRowClick,
  selectable = false,
  selectedRows: controlledSelected,
  onSelectionChange,
  emptyMessage = "No data available",
  pageSize = 10,
  className,
  rowKey,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")
  const [page, setPage] = React.useState(0)
  const [internalSelected, setInternalSelected] = React.useState<Set<number>>(new Set())

  const selected = controlledSelected ?? internalSelected
  const setSelected = onSelectionChange ?? setInternalSelected

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data

    const col = columns.find((c) => c.id === sortColumn)
    if (!col?.accessorKey) return data

    const key = col.accessorKey
    return [...data].sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDirection === "asc" ? cmp : -cmp
    })
  }, [data, sortColumn, sortDirection, columns])

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const paginatedData = sortedData.slice(page * pageSize, (page + 1) * pageSize)

  // Reset page on data change
  React.useEffect(() => {
    setPage(0)
  }, [data.length])

  function handleSort(colId: string) {
    if (sortColumn === colId) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(colId)
      setSortDirection("asc")
    }
  }

  function toggleRow(index: number) {
    const globalIndex = page * pageSize + index
    const next = new Set(selected)
    if (next.has(globalIndex)) {
      next.delete(globalIndex)
    } else {
      next.add(globalIndex)
    }
    setSelected(next)
  }

  function toggleAll() {
    if (selected.size === sortedData.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sortedData.map((_, i) => i)))
    }
  }

  function getSortIcon(colId: string) {
    if (sortColumn !== colId) return <ArrowUpDown className="size-4 text-[#666666]" />
    return sortDirection === "asc" ? (
      <ArrowUp className="size-4 text-[#FAFAFA]" />
    ) : (
      <ArrowDown className="size-4 text-[#FAFAFA]" />
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-[12px] border border-[#2A2A2A] bg-[#141414] p-12 text-sm text-[#A0A0A0]">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn("overflow-hidden rounded-[12px] border border-[#2A2A2A]", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] bg-[#0A0A0A]">
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={selected.size === sortedData.length && sortedData.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#A0A0A0]",
                    col.sortable && "cursor-pointer select-none hover:text-[#FAFAFA]"
                  )}
                  onClick={col.sortable ? () => handleSort(col.id) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && getSortIcon(col.id)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => (
              <tr
                key={rowKey ? rowKey(row, page * pageSize + idx) : idx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-[#2A2A2A] bg-[#141414] transition-colors last:border-b-0",
                  onRowClick && "cursor-pointer",
                  "hover:bg-[#1E1E1E]",
                  selected.has(page * pageSize + idx) && "bg-[#1E1E1E]"
                )}
              >
                {selectable && (
                  <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(page * pageSize + idx)}
                      onCheckedChange={() => toggleRow(idx)}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.id} className="px-4 py-3 text-[#FAFAFA]">
                    {col.cell
                      ? col.cell(row)
                      : col.accessorKey
                        ? String(row[col.accessorKey] ?? "")
                        : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3">
          <span className="text-xs text-[#666666]">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="text-[#A0A0A0]"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="text-[#A0A0A0]"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { DataTable }
export type { DataTableProps, ColumnDef }
