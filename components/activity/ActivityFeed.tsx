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

interface ActivityFeedProps {
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

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <div className="mt-0.5 h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityFeed({ initialEntries }: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>(initialEntries);
  const [filters, setFilters] = useState<ActivityFilterState>({
    entityTypes: [],
    sources: [],
    dateRange: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialEntries.length >= PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

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
    [filters]
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

        // Client-side multi-value filtering for entity_type and source
        if (filters.entityTypes.length > 1) {
          data = data.filter((e) => filters.entityTypes.includes(e.entity_type));
        }
        if (filters.sources.length > 1) {
          data = data.filter((e) => filters.sources.includes(e.source));
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
    [buildParams, filters.entityTypes, filters.sources]
  );

  // Refetch when filters change (skip initial mount since we have initialEntries)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchEntries(0, false);
  }, [fetchEntries]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        const first = observerEntries[0];
        if (first.isIntersecting && hasMore && !loading && !loadingMore) {
          fetchEntries(entries.length, true);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, entries.length, fetchEntries]);

  const grouped = groupByDate(entries);
  const hasFilters =
    filters.entityTypes.length > 0 || filters.sources.length > 0 || filters.dateRange !== "";

  return (
    <div className="space-y-4">
      <ActivityFilters filters={filters} onChange={setFilters} />

      {loading ? (
        <div className="rounded-lg border border-border bg-card">
          <LoadingSkeleton />
        </div>
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
        <div className="space-y-6">
          {DATE_ORDER.filter((label) => grouped[label]).map((label) => (
            <div key={label}>
              <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </h3>
              <div className="divide-y divide-border rounded-lg border border-border bg-card">
                {grouped[label].map((entry) => (
                  <ActivityItem key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
