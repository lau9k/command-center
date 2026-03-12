"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
import { SyncSourceCards, type SyncLogEntry } from "@/components/sync/SyncSourceCards";
import { SyncHistoryTable } from "@/components/sync/SyncHistoryTable";
import { EmptyState } from "@/components/ui/empty-state";

const SyncFrequencyChart = dynamic(
  () =>
    import("@/components/sync/SyncFrequencyChart").then(
      (mod) => mod.SyncFrequencyChartInner
    ),
  { ssr: false, loading: () => <div className="h-[240px] animate-pulse rounded-lg border border-border bg-card" /> }
);

const PAGE_SIZE = 50;

export default function SyncPage() {
  const [entries, setEntries] = useState<SyncLogEntry[]>([]);
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [syncingSource, setSyncingSource] = useState<string | null>(null);

  const fetchEntries = useCallback(
    async (src: string, st: string, offset = 0, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (src) params.set("source", src);
        if (st) params.set("status", st);
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));

        const res = await fetch(`/api/sync/log?${params.toString()}`);
        const json = await res.json();
        const data = (json.data ?? []) as SyncLogEntry[];

        if (append) {
          setEntries((prev) => [...prev, ...data]);
        } else {
          setEntries(data);
        }
        setHasMore(data.length >= PAGE_SIZE);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchEntries(source, status);
  }, [source, status, fetchEntries]);

  const handleTriggerSync = async (syncSource: string) => {
    setSyncingSource(syncSource);
    try {
      let endpoint: string | null = null;
      if (syncSource === "plaid") {
        endpoint = "/api/plaid/sync";
      } else if (syncSource === "personize") {
        endpoint = "/api/personize/recall";
      }

      if (endpoint) {
        await fetch(endpoint, { method: "POST" });
      }

      // Refresh the table after sync
      await fetchEntries(source, status);
    } finally {
      setSyncingSource(null);
    }
  };

  const loadMore = () => {
    fetchEntries(source, status, entries.length, true);
  };

  const isFirstLoad = loading && entries.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Sync Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor data source syncs and trigger manual refreshes
          </p>
        </div>
        <button
          onClick={() => fetchEntries(source, status)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </button>
      </div>

      {isFirstLoad ? (
        /* Skeleton loading */
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg border border-border bg-card"
              />
            ))}
          </div>
          <div className="h-[240px] animate-pulse rounded-lg border border-border bg-card" />
          <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
        </div>
      ) : entries.length === 0 && !source && !status ? (
        <EmptyState
          title="No sync history"
          description="Data source syncs will appear here once you connect Plaid or other integrations."
          icon={<RefreshCw />}
        />
      ) : (
        <>
          {/* Source Status Cards */}
          <SyncSourceCards
            entries={entries}
            onTriggerSync={handleTriggerSync}
            syncingSource={syncingSource}
          />

          {/* Frequency Chart */}
          <div className="rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:border-ring/50 hover:shadow-sm">
            <h3 className="mb-4 text-sm font-medium text-muted-foreground">
              Sync Frequency
            </h3>
            <SyncFrequencyChart entries={entries} />
          </div>

          {/* History Table */}
          <SyncHistoryTable
            entries={entries}
            source={source}
            status={status}
            onSourceChange={setSource}
            onStatusChange={setStatus}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        </>
      )}
    </div>
  );
}
