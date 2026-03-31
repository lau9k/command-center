"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// --- Types ---

interface FilterOption {
  label: string
  value: string
}

interface FilterDefinition {
  id: string
  label: string
  options: FilterOption[]
}

type FilterValues = Record<string, string[]>

interface FilterBarProps {
  filters: FilterDefinition[]
  values: FilterValues
  onChange: (values: FilterValues) => void
  className?: string
}

// --- MultiSelect Dropdown ---

function FilterDropdown({
  filter,
  selected,
  onToggle,
}: {
  filter: FilterDefinition
  selected: string[]
  onToggle: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground",
          selected.length > 0 && "border-blue-500/50 text-foreground"
        )}
      >
        {filter.label}
        {selected.length > 0 && (
          <span className="ml-0.5 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-medium text-white leading-none">
            {selected.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-card py-1 shadow-xl">
          {filter.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                selected.includes(opt.value) ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded border",
                  selected.includes(opt.value)
                    ? "border-blue-500 bg-blue-500"
                    : "border-border"
                )}
              >
                {selected.includes(opt.value) && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- FilterBar ---

function FilterBar({ filters, values, onChange, className }: FilterBarProps) {
  function toggleValue(filterId: string, value: string) {
    const current = values[filterId] ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]

    onChange({ ...values, [filterId]: next })
  }

  function removeChip(filterId: string, value: string) {
    const current = values[filterId] ?? []
    onChange({ ...values, [filterId]: current.filter((v) => v !== value) })
  }

  function clearAll() {
    const cleared: FilterValues = {}
    for (const f of filters) {
      cleared[f.id] = []
    }
    onChange(cleared)
  }

  const hasActiveFilters = Object.values(values).some((v) => v.length > 0)

  // Build chip labels
  const activeChips: { filterId: string; value: string; label: string }[] = []
  for (const f of filters) {
    for (const v of values[f.id] ?? []) {
      const opt = f.options.find((o) => o.value === v)
      activeChips.push({ filterId: f.id, value: v, label: opt?.label ?? v })
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <FilterDropdown
            key={f.id}
            filter={f}
            selected={values[f.id] ?? []}
            onToggle={(v) => toggleValue(f.id, v)}
          />
        ))}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <span
              key={`${chip.filterId}-${chip.value}`}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-foreground"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip.filterId, chip.value)}
                className="ml-0.5 rounded-full p-0.5 text-text-muted transition-colors hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export { FilterBar }
export type { FilterBarProps, FilterDefinition, FilterOption, FilterValues }
