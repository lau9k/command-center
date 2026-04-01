"use client";

import { useCallback, useMemo } from "react";
import { Search } from "lucide-react";
import {
  FilterBar,
  type FilterDefinition,
  type FilterValues,
} from "@/components/ui/filter-bar";

const ENTITY_TYPE_FILTER: FilterDefinition = {
  id: "entity_type",
  label: "Entity Type",
  options: [
    { label: "Contacts", value: "contact" },
    { label: "Tasks", value: "task" },
    { label: "Conversations", value: "conversation" },
    { label: "Sponsors", value: "sponsor" },
    { label: "Transactions", value: "transaction" },
    { label: "Content", value: "content_post" },
  ],
};

const ACTION_FILTER: FilterDefinition = {
  id: "action",
  label: "Action",
  options: [
    { label: "Created", value: "created" },
    { label: "Updated", value: "updated" },
    { label: "Deleted", value: "deleted" },
    { label: "Ingested", value: "ingested" },
    { label: "Synced", value: "synced" },
  ],
};

const SOURCE_FILTER: FilterDefinition = {
  id: "source",
  label: "Source",
  options: [
    { label: "Manual", value: "manual" },
    { label: "Webhook", value: "webhook" },
    { label: "n8n", value: "n8n" },
    { label: "Granola", value: "granola" },
    { label: "Plaid", value: "plaid" },
    { label: "Personize", value: "personize" },
  ],
};

type DateRange = "today" | "week" | "month" | "";

export interface ActivityFilterState {
  entityTypes: string[];
  actions: string[];
  sources: string[];
  dateRange: DateRange;
  search: string;
}

interface ActivityFiltersProps {
  filters: ActivityFilterState;
  onChange: (filters: ActivityFilterState) => void;
}

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: "All time", value: "" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
];

export function getDateRangeBounds(range: DateRange): { from?: string; to?: string } {
  if (!range) return {};

  const now = new Date();
  const to = now.toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case "today":
      return { from: startOfDay.toISOString(), to };
    case "week": {
      const weekAgo = new Date(startOfDay.getTime() - 7 * 86400000);
      return { from: weekAgo.toISOString(), to };
    }
    case "month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: monthStart.toISOString(), to };
    }
    default:
      return {};
  }
}

export function ActivityFilters({ filters, onChange }: ActivityFiltersProps) {
  const filterDefs = useMemo(() => [ACTION_FILTER, ENTITY_TYPE_FILTER, SOURCE_FILTER], []);

  const filterValues: FilterValues = useMemo(
    () => ({
      action: filters.actions,
      entity_type: filters.entityTypes,
      source: filters.sources,
    }),
    [filters.actions, filters.entityTypes, filters.sources]
  );

  const handleFilterBarChange = useCallback(
    (values: FilterValues) => {
      onChange({
        ...filters,
        actions: values.action ?? [],
        entityTypes: values.entity_type ?? [],
        sources: values.source ?? [],
      });
    },
    [filters, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search activity..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="h-9 w-56 rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <FilterBar
          filters={filterDefs}
          values={filterValues}
          onChange={handleFilterBarChange}
        />

        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
          {DATE_RANGES.map((dr) => (
            <button
              key={dr.value}
              type="button"
              onClick={() => onChange({ ...filters, dateRange: dr.value })}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filters.dateRange === dr.value
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {dr.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
