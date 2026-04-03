"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Clock,
  Database,
} from "lucide-react";

const REFRESH_INTERVAL_MS = 60_000;

interface TableInfo {
  last_ingested_at: string | null;
  row_count: number;
}

interface SyncEntry {
  source: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  records_synced: number | null;
}

interface PipelineData {
  sync_stats_24h: {
    success: number;
    error: number;
    partial: number;
    running: number;
    total: number;
  };
  avg_processing_latency_ms: number | null;
  stuck_events: number;
  last_synthetic_test: {
    result: "pass" | "fail";
    tested_at: string;
  } | null;
  recent_sync_entries: SyncEntry[];
}

interface N8nSource {
  last_sync_at: string | null;
  status: string | null;
  records_synced: number | null;
}

interface HealthData {
  tables: Record<string, TableInfo>;
  sync_log: Record<string, { status: string; started_at: string; completed_at: string | null; records_synced: number | null }>;
  n8n: Record<string, N8nSource>;
  pipeline: PipelineData;
  checked_at: string;
}

type OverallStatus = "healthy" | "degraded" | "down";

function getOverallStatus(data: HealthData): OverallStatus {
  const { pipeline, n8n } = data;

  // Red: stuck events or synthetic test failed or all n8n sources errored
  if (pipeline.stuck_events > 2) return "down";
  if (pipeline.last_synthetic_test?.result === "fail") return "down";

  const n8nStatuses = Object.values(n8n);
  const allErrored = n8nStatuses.length > 0 && n8nStatuses.every((s) => s.status === "error");
  if (allErrored) return "down";

  // Yellow: any stuck events, any n8n errors, or high error rate
  if (pipeline.stuck_events > 0) return "degraded";
  if (pipeline.sync_stats_24h.error > 0) return "degraded";
  if (n8nStatuses.some((s) => s.status === "error")) return "degraded";

  return "healthy";
}

function getSourceStatus(source: N8nSource): OverallStatus {
  if (!source.status || !source.last_sync_at) return "down";
  if (source.status === "error") return "down";
  if (source.status === "partial" || source.status === "running") return "degraded";
  return "healthy";
}

const STATUS_CONFIG: Record<
  OverallStatus,
  { label: string; dotClass: string; badgeClass: string; icon: React.ReactNode }
> = {
  healthy: {
    label: "Healthy",
    dotClass: "bg-green-500",
    badgeClass: "bg-green-500/20 text-green-600 dark:text-green-400",
    icon: <CheckCircle className="size-3.5" />,
  },
  degraded: {
    label: "Degraded",
    dotClass: "bg-yellow-500",
    badgeClass: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    icon: <AlertTriangle className="size-3.5" />,
  },
  down: {
    label: "Down",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-500/20 text-red-600 dark:text-red-400",
    icon: <XCircle className="size-3.5" />,
  },
};

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatSourceName(source: string): string {
  return source
    .replace("n8n:", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PipelineHealth() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch("/api/ingest/health");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => fetchHealth(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <XCircle className="mx-auto size-8 text-red-500" />
        <p className="mt-2 text-sm text-foreground">Failed to load pipeline health</p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchHealth(true)}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const overall = getOverallStatus(data);
  const overallConfig = STATUS_CONFIG[overall];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${overallConfig.badgeClass}`}
          >
            <span className={`size-2 rounded-full ${overallConfig.dotClass}`} />
            Pipeline: {overallConfig.label}
          </span>
          {data.pipeline.stuck_events > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="size-3.5" />
              {data.pipeline.stuck_events} stuck event
              {data.pipeline.stuck_events !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Updated {formatTimeAgo(data.checked_at)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            {isRefreshing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="gap-2 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="size-4 text-green-500" />
            Successful (24h)
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {data.pipeline.sync_stats_24h.success}
          </p>
        </Card>
        <Card className="gap-2 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="size-4 text-red-500" />
            Failed (24h)
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {data.pipeline.sync_stats_24h.error}
          </p>
        </Card>
        <Card className="gap-2 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            Avg Latency
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {data.pipeline.avg_processing_latency_ms !== null
              ? `${data.pipeline.avg_processing_latency_ms}ms`
              : "N/A"}
          </p>
        </Card>
        <Card className="gap-2 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="size-4" />
            Synthetic Test
          </div>
          {data.pipeline.last_synthetic_test ? (
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {data.pipeline.last_synthetic_test.result === "pass" ? (
                  <span className="text-green-600 dark:text-green-400">Pass</span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">Fail</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatTimeAgo(data.pipeline.last_synthetic_test.tested_at)}
              </p>
            </div>
          ) : (
            <p className="text-2xl font-semibold text-muted-foreground">N/A</p>
          )}
        </Card>
      </div>

      {/* N8N source status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">n8n Source Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(data.n8n).map(([source, info]) => {
            const status = getSourceStatus(info);
            const config = STATUS_CONFIG[status];

            return (
              <div
                key={source}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${config.dotClass}`} />
                  <span className="text-sm font-medium text-foreground">
                    {formatSourceName(source)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {info.records_synced !== null && (
                    <span>{info.records_synced} records</span>
                  )}
                  <span>{formatTimeAgo(info.last_sync_at)}</span>
                  <Badge
                    variant={
                      status === "healthy"
                        ? "default"
                        : status === "degraded"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {config.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Entity table row counts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Entity Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {Object.entries(data.tables).map(([table, info]) => (
              <div key={table} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground capitalize">
                  {table}
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {info.row_count.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last: {formatTimeAgo(info.last_ingested_at)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent sync log */}
      {data.pipeline.recent_sync_entries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Sync Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.pipeline.recent_sync_entries.map((entry, i) => (
                <div
                  key={`${entry.source}-${entry.started_at}-${i}`}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-1.5 rounded-full ${
                        entry.status === "success"
                          ? "bg-green-500"
                          : entry.status === "error"
                            ? "bg-red-500"
                            : entry.status === "running"
                              ? "bg-yellow-500"
                              : "bg-muted-foreground"
                      }`}
                    />
                    <span className="font-medium text-foreground">
                      {entry.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {entry.records_synced !== null && (
                      <span>{entry.records_synced} records</span>
                    )}
                    <span>{formatTimeAgo(entry.started_at)}</span>
                    <span
                      className={
                        entry.status === "success"
                          ? "text-green-600 dark:text-green-400"
                          : entry.status === "error"
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                      }
                    >
                      {entry.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
