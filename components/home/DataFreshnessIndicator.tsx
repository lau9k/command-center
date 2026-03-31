"use client";

import { Database, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { DataFreshnessResponse } from "@/app/api/data-freshness/route";

const REFRESH_INTERVAL_MS = 60_000;
const DISPLAY_REFRESH_MS = 10_000;

interface SectionConfig {
  key: keyof DataFreshnessResponse;
  label: string;
}

const SECTIONS: SectionConfig[] = [
  { key: "contacts", label: "Contacts" },
  { key: "tasks", label: "Tasks" },
  { key: "pipeline_items", label: "Pipeline" },
  { key: "content_posts", label: "Content" },
  { key: "meetings", label: "Meetings" },
];

type FreshnessStatus = "fresh" | "stale" | "outdated" | "none";

function getStatus(timestamp: string | null): FreshnessStatus {
  if (!timestamp) return "none";
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageHours = ageMs / 3_600_000;
  if (ageHours < 1) return "fresh";
  if (ageHours < 24) return "stale";
  return "outdated";
}

const STATUS_STYLES: Record<FreshnessStatus, string> = {
  fresh: "bg-green-500",
  stale: "bg-yellow-500",
  outdated: "bg-red-500",
  none: "bg-muted-foreground/40",
};

function formatTimeAgo(timestamp: string | null): string {
  if (!timestamp) return "No data";
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DataFreshnessIndicator() {
  const [data, setData] = useState<DataFreshnessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/data-freshness");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = (await res.json()) as { data: DataFreshnessResponse };
      setData(json.data);
      setHasError(false);
    } catch {
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => void fetchData(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Re-render to update relative timestamps
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), DISPLAY_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <div className="size-4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-20 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (hasError && !data) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Unable to load data freshness
          </p>
          <button
            onClick={() => void fetchData()}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Database className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Data Freshness</h3>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {SECTIONS.map(({ key, label }) => {
          const timestamp = data?.[key] ?? null;
          const status = getStatus(timestamp);
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className={`inline-block size-2 rounded-full ${STATUS_STYLES[status]}`}
                title={timestamp ?? "No data"}
              />
              <span className="text-xs text-muted-foreground">
                {label}{" "}
                <span className="text-foreground/70">
                  {formatTimeAgo(timestamp)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
