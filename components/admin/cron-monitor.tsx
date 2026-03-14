"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncLogEntry {
  id: string;
  source: string;
  status: "success" | "error" | "partial" | "running";
  started_at: string;
  finished_at: string | null;
  records_synced: number | null;
  error_message: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle2,
    color: "text-green-500",
    badge: "default" as const,
    label: "Success",
  },
  error: {
    icon: XCircle,
    color: "text-red-500",
    badge: "destructive" as const,
    label: "Failed",
  },
  partial: {
    icon: Clock,
    color: "text-yellow-500",
    badge: "secondary" as const,
    label: "Partial",
  },
  running: {
    icon: Play,
    color: "text-blue-500",
    badge: "secondary" as const,
    label: "Running",
  },
};

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "In progress";
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CronMonitor() {
  const [entries, setEntries] = useState<SyncLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sync/log?limit=20");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to fetch sync logs");
      }

      setEntries(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load sync logs";
      toast.error(message);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (initialLoad) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Loading sync history…
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Sync Job History
            </CardTitle>
            <CardDescription>
              {total} total sync job{total !== 1 ? "s" : ""} recorded — showing
              last 20
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No sync jobs recorded yet.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const cfg = STATUS_CONFIG[entry.status];
                  const StatusIcon = cfg.icon;

                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-sm">
                        {entry.source}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusIcon
                            className={`h-3.5 w-3.5 ${cfg.color}`}
                          />
                          <Badge variant={cfg.badge} className="text-xs">
                            {cfg.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground"
                        title={new Date(entry.started_at).toLocaleString()}
                      >
                        {formatRelativeTime(entry.started_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDuration(entry.started_at, entry.finished_at)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {entry.records_synced !== null
                          ? entry.records_synced.toLocaleString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {entries.some((e) => e.error_message) && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium">Recent Errors</h4>
            {entries
              .filter((e) => e.error_message)
              .slice(0, 5)
              .map((e) => (
                <div
                  key={`error-${e.id}`}
                  className="rounded-md bg-destructive/10 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-destructive">
                      {e.source}
                    </span>
                    <span className="text-muted-foreground">
                      {formatRelativeTime(e.started_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-destructive">{e.error_message}</p>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
