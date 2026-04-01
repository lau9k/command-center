"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ActivityItem, type ActivityLogEntry } from "./ActivityItem";
import {
  ActivityFilters,
  getDateRangeBounds,
  type ActivityFilterState,
} from "./ActivityFilters";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE_SIZE = 20;

interface ActivityTimelineProps {
  initialEntries: ActivityLogEntry[];
}

function groupByDate(entries: ActivityLogEntry[]): Record<string, ActivityLogEntry[]> {
  const groups: Record<string, ActivityLogEntry[]> = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  for (const entry of entries) {
    const entryDate = new Date(entry.created_at);
    const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());

    let label: string;
    if (entryDay.getTime() === today.getTime()) {
      label = "Today";
    } else if (entryDay.getTime() === yesterday.getTime()) {
      label = "Yesterday";
    } else if (entryDay >= weekAgo) {
      label = "This Week";
    } else {
      label = "Older";
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(entry);
  }

  return groups;
}

const DATE_ORDER = ["Today", "Yesterday", "This Week", "Older"];

const INITIAL_FILTERS: ActivityFilterState = {
  entityTypes: [],
  actions: [],
  sources: [],
  dateRange: "",
  search: "",
};

export function ActivityTimeline({ initialEntries }: ActivityTimelineProps) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>(initialEntries);
  const [filters, setFilters] = useState<ActivityFilterState>(INITIAL_FILTERS);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialEntries.length >= PAGE_SIZE);
  const isInitialMount = useRef(true);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildParams = useCallback(
    (offset = 0): URLSearchParams => {
      const params = new URLSearchParams();
      if (filters.entityTypes.length === 1) {
        params.set("entity_type", filters.entityTypes[0]);
      }
      if (filters.sources.length === 1) {
        params.set("source", filters.sources[0]);
      }
      const { from, to } = getDateRangeBounds(filters.dateRange);
      if (from) params.set("date_from", from);
      if (to) params.set("date_to", to);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      return params;
    },
    [filters.entityTypes, filters.sources, filters.dateRange]
  );

  const fetchEntries = useCallback(
    async (offset = 0, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const params = buildParams(offset);
        const res = await fetch(`/api/activity?${params.toString()}`);
        const json = await res.json();
        let data = (json.data ?? []) as ActivityLogEntry[];

        // Client-side multi-value filtering
        if (filters.entityTypes.length > 1) {
          data = data.filter((e) => filters.entityTypes.includes(e.entity_type));
        }
        if (filters.sources.length > 1) {
          data = data.filter((e) => filters.sources.includes(e.source));
        }
        if (filters.actions.length > 0) {
          data = data.filter((e) => filters.actions.includes(e.action));
        }

        // Client-side keyword search
        if (filters.search.trim()) {
          const q = filters.search.trim().toLowerCase();
          data = data.filter(
            (e) =>
              (e.entity_name?.toLowerCase().includes(q)) ||
              e.action.toLowerCase().includes(q) ||
              e.entity_type.toLowerCase().includes(q) ||
              e.source.toLowerCase().includes(q)
          );
        }

        if (append) {
          setEntries((prev) => [...prev, ...data]);
        } else {
          setEntries(data);
        }
        setHasMore(data.length >= PAGE_SIZE);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildParams, filters.entityTypes, filters.sources, filters.actions, filters.search]
  );

  // Refetch when filters change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchEntries(0, false);
  }, [fetchEntries]);

  // Debounce search input
  const handleFiltersChange = useCallback((newFilters: ActivityFilterState) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setFilters(newFilters);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchEntries(entries.length, true);
    }
  }, [loadingMore, hasMore, entries.length, fetchEntries]);

  const grouped = groupByDate(entries);
  const hasFilters =
    filters.entityTypes.length > 0 ||
    filters.actions.length > 0 ||
    filters.sources.length > 0 ||
    filters.dateRange !== "" ||
    filters.search.trim() !== "";

  return (
    <div className="space-y-4">
      <ActivityFilters filters={filters} onChange={handleFiltersChange} />

      {loading ? (
        <TimelineSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No matching activity" : "No activity yet"}
          description={
            hasFilters
              ? "Try adjusting your filters to see more results."
              : "Actions like creating contacts, updating tasks, or syncing data will appear here."
          }
        />
      ) : (
        <div className="space-y-8">
          {DATE_ORDER.filter((label) => grouped[label]).map((label) => (
            <div key={label}>
              {/* Date group header */}
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </h3>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">
                  {grouped[label].length} {grouped[label].length === 1 ? "event" : "events"}
                </span>
              </div>

              {/* Timeline entries */}
              <div className="relative ml-4">
                {/* Vertical timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-0">
                  {grouped[label].map((entry, idx) => (
                    <div key={entry.id} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
                        <TimelineDot entityType={entry.entity_type} />
                      </div>

                      {/* Activity card */}
                      <div
                        className={`flex-1 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-accent/50 ${
                          idx < grouped[label].length - 1 ? "mb-3" : ""
                        }`}
                      >
                        <ActivityItem entry={entry} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more button */}
      {hasMore && !loading && entries.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

const ENTITY_DOT_COLORS: Record<string, string> = {
  contact: "bg-green-500",
  task: "bg-blue-500",
  conversation: "bg-purple-500",
  sponsor: "bg-orange-500",
  transaction: "bg-yellow-500",
  content_post: "bg-purple-500",
};

function TimelineDot({ entityType }: { entityType: string }) {
  const color = ENTITY_DOT_COLORS[entityType] ?? "bg-muted-foreground";
  return (
    <div className={`h-2.5 w-2.5 rounded-full ${color} ring-4 ring-background`} />
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4 flex items-center gap-3">
          <div className="h-3 w-12 animate-pulse rounded bg-muted" />
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="relative ml-4">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="relative flex gap-4">
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-muted ring-4 ring-background" />
                </div>
                <div className="flex-1 rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="flex gap-2">
                        <div className="h-4 w-16 animate-pulse rounded-full bg-muted" />
                        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
