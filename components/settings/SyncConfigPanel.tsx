"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  CreditCard,
  Video,
  Workflow,
  UserSearch,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncSource {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  hasEndpoint: boolean;
}

interface SourceStatus {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "error";
  lastSync: string | null;
  recordCount: number;
}

interface SyncLogEntry {
  source: string;
  status: "success" | "error" | "partial" | "running";
  completed_at: string | null;
  started_at: string;
}

interface PipelineHealthData {
  status: "healthy" | "degraded" | "unhealthy";
  data: {
    n8n: Record<string, {
      last_sync_at: string | null;
      status: string | null;
      records_synced: number | null;
    }>;
    queue: {
      pending: number;
      retryable: number;
      dead_letter: number;
      oldest_pending_age_ms: number | null;
    };
    pipeline: {
      sync_stats_24h: {
        success: number;
        error: number;
        partial: number;
        running: number;
        total: number;
      };
    };
    checked_at: string;
  };
}

const SYNC_SOURCES: SyncSource[] = [
  { id: "gmail", name: "Gmail", icon: <Mail className="h-4 w-4" />, description: "Email messages and threads", hasEndpoint: true },
  { id: "plaid", name: "Plaid", icon: <CreditCard className="h-4 w-4" />, description: "Bank transactions and accounts", hasEndpoint: true },
  { id: "granola", name: "Granola", icon: <Video className="h-4 w-4" />, description: "Meeting notes and transcripts", hasEndpoint: true },
  { id: "n8n", name: "n8n", icon: <Workflow className="h-4 w-4" />, description: "Workflow automation triggers", hasEndpoint: false },
  { id: "personize", name: "Personize", icon: <UserSearch className="h-4 w-4" />, description: "Contact enrichment data", hasEndpoint: false },
];

const SYNC_INTERVALS: Record<string, string> = {
  gmail: "Every 15 minutes",
  plaid: "Every 6 hours",
  granola: "Every hour",
  n8n: "On trigger",
  personize: "On demand",
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusIndicator({ status }: { status: "connected" | "disconnected" | "error" }) {
  if (status === "connected") {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
  if (status === "error") {
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

export function SyncConfigPanel() {
  const [sourceStatuses, setSourceStatuses] = useState<SourceStatus[]>([]);
  const [enabledSources, setEnabledSources] = useState<Record<string, boolean>>({
    gmail: true,
    plaid: true,
    granola: true,
    n8n: true,
    personize: true,
  });
  const [syncingSources, setSyncingSources] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [lastSyncTimes, setLastSyncTimes] = useState<Record<string, string | null>>({});

  const { data: healthData } = useQuery<PipelineHealthData>({
    queryKey: ["ingest-health"],
    queryFn: async () => {
      const res = await fetch("/api/ingest/health");
      if (!res.ok) throw new Error("Failed to fetch pipeline health");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const fetchStatuses = useCallback(async () => {
    try {
      const [dsRes, logRes] = await Promise.all([
        fetch("/api/data-sources"),
        fetch("/api/sync/log?limit=50"),
      ]);

      if (dsRes.ok) {
        const dsData = await dsRes.json();
        setSourceStatuses(dsData.data ?? []);
      }

      if (logRes.ok) {
        const logData = await logRes.json();
        const entries: SyncLogEntry[] = logData.data ?? [];
        const latestBySource: Record<string, string | null> = {};
        for (const entry of entries) {
          if (!latestBySource[entry.source] && (entry.status === "success" || entry.status === "partial")) {
            latestBySource[entry.source] = entry.completed_at ?? entry.started_at;
          }
        }
        setLastSyncTimes(latestBySource);
      }
    } catch {
      // Silently fail, status will show as disconnected
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleToggle = (sourceId: string, enabled: boolean) => {
    setEnabledSources((prev) => ({ ...prev, [sourceId]: enabled }));
  };

  const handleSyncNow = async (sourceId: string) => {
    setSyncingSources((prev) => ({ ...prev, [sourceId]: true }));
    try {
      const res = await fetch("/api/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: sourceId }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        toast.success(`${sourceId} sync completed`);
        await fetchStatuses();
      } else {
        toast.error(result.error ?? `${sourceId} sync failed`);
      }
    } catch {
      toast.error(`Failed to trigger ${sourceId} sync`);
    } finally {
      setSyncingSources((prev) => ({ ...prev, [sourceId]: false }));
    }
  };

  const getSourceStatus = (sourceId: string): SourceStatus | undefined => {
    return sourceStatuses.find((s) => s.id === sourceId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {SYNC_SOURCES.map((source) => (
          <div
            key={source.id}
            className="h-20 animate-pulse rounded-lg border border-border bg-muted/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {SYNC_SOURCES.map((source) => {
        const status = getSourceStatus(source.id);
        const connectionStatus = status?.status ?? "disconnected";
        const recordCount = status?.recordCount ?? 0;
        const lastSync = lastSyncTimes[source.id] ?? status?.lastSync;
        const isSyncing = syncingSources[source.id] ?? false;
        const isEnabled = enabledSources[source.id] ?? true;

        return (
          <div
            key={source.id}
            className={cn(
              "rounded-lg border border-border p-4 transition-colors",
              !isEnabled && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  {source.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">
                      {source.name}
                    </h3>
                    <StatusIndicator status={connectionStatus} />
                    <span
                      className={cn(
                        "text-xs font-medium",
                        connectionStatus === "connected" && "text-green-500",
                        connectionStatus === "error" && "text-red-500",
                        connectionStatus === "disconnected" && "text-muted-foreground"
                      )}
                    >
                      {connectionStatus}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {source.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {recordCount.toLocaleString()} records
                    </span>
                    <span>
                      Last sync: {lastSync ? formatRelativeTime(lastSync) : "never"}
                    </span>
                    <span>
                      Interval: {SYNC_INTERVALS[source.id]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {source.hasEndpoint && isEnabled && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncNow(source.id)}
                    disabled={isSyncing}
                    className="h-8 gap-1.5"
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
                    />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </Button>
                )}
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleToggle(source.id, checked)}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Pipeline Health Section */}
      {healthData?.data && (
        <div className="rounded-lg border border-border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">
                Pipeline Health
              </h3>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                healthData.status === "healthy" && "bg-green-500/10 text-green-500",
                healthData.status === "degraded" && "bg-yellow-500/10 text-yellow-500",
                healthData.status === "unhealthy" && "bg-red-500/10 text-red-500"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  healthData.status === "healthy" && "bg-green-500",
                  healthData.status === "degraded" && "bg-yellow-500",
                  healthData.status === "unhealthy" && "bg-red-500"
                )}
              />
              {healthData.status === "healthy"
                ? "Pipeline Healthy"
                : healthData.status === "degraded"
                  ? "Pipeline Warning"
                  : "Pipeline Error"}
            </span>
          </div>

          {/* Queue Status */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Queue Status
            </p>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["Pending", healthData.data.queue.pending, healthData.data.queue.pending > 0 ? "text-yellow-500" : "text-green-500"],
                  ["Retryable", healthData.data.queue.retryable, healthData.data.queue.retryable > 0 ? "text-yellow-500" : "text-green-500"],
                  ["Dead Letter", healthData.data.queue.dead_letter, healthData.data.queue.dead_letter > 0 ? "text-red-500" : "text-green-500"],
                ] as const
              ).map(([label, count, color]) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span className="text-muted-foreground">{label}:</span>
                  <span className={cn("font-medium", color)}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* n8n Source Freshness */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              n8n Source Freshness
            </p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(healthData.data.n8n).map(([source, info]) => (
                <div
                  key={source}
                  className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs"
                >
                  <span className="text-muted-foreground">
                    {source.replace("n8n:", "")}
                  </span>
                  <span className="text-foreground">
                    {info.last_sync_at
                      ? formatRelativeTime(info.last_sync_at)
                      : "never"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 24h Sync Stats */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              24h Sync Stats
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span>
                <span className="text-muted-foreground">Success: </span>
                <span className="font-medium text-green-500">
                  {healthData.data.pipeline.sync_stats_24h.success}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">Errors: </span>
                <span
                  className={cn(
                    "font-medium",
                    healthData.data.pipeline.sync_stats_24h.error > 0
                      ? "text-red-500"
                      : "text-muted-foreground"
                  )}
                >
                  {healthData.data.pipeline.sync_stats_24h.error}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-medium text-foreground">
                  {healthData.data.pipeline.sync_stats_24h.total}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
