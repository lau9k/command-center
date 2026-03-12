"use client";

import { useCallback, useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { ActivityItem, type ActivityLogEntry } from "./ActivityItem";
import { EmptyState } from "@/components/ui/empty-state";

const ENTITY_TYPES = ["contact", "task", "conversation", "sponsor", "transaction", "content_post"] as const;
const SOURCES = ["manual", "webhook", "n8n", "granola", "plaid", "personize"] as const;
const PAGE_SIZE = 50;

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

export function ActivityFeed({ initialEntries }: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityLogEntry[]>(initialEntries);
  const [entityType, setEntityType] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialEntries.length >= PAGE_SIZE);

  const fetchEntries = useCallback(async (type: string, src: string, offset = 0, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set("entity_type", type);
      if (src) params.set("source", src);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));

      const res = await fetch(`/api/activity?${params.toString()}`);
      const json = await res.json();
      const data = (json.data ?? []) as ActivityLogEntry[];

      if (append) {
        setEntries((prev) => [...prev, ...data]);
      } else {
        setEntries(data);
      }
      setHasMore(data.length >= PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries(entityType, source);
  }, [entityType, source, fetchEntries]);

  const loadMore = () => {
    fetchEntries(entityType, source, entries.length, true);
  };

  const grouped = groupByDate(entries);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <Filter className="h-4 w-4 text-muted-foreground" />

        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">All types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">All sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {(entityType || source) && (
          <button
            onClick={() => {
              setEntityType("");
              setSource("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Feed */}
      {entries.length === 0 && !loading ? (
        <EmptyState
          title="No activity yet"
          description="Actions like creating contacts, updating tasks, or syncing data will appear here."
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

      {/* Load More */}
      {hasMore && entries.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
