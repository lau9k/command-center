"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
  Play,
  AlertTriangle,
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

interface CronJobLastRun {
  id: string;
  status: "success" | "error" | "partial" | "running";
  started_at: string;
  finished_at: string | null;
  records_synced: number | null;
  error_message: string | null;
}

interface CronJobStatus {
  source: string;
  label: string;
  schedule: string;
  lastRun: CronJobLastRun | null;
  nextScheduled: string | null;
}

interface CronResponse {
  data: CronJobStatus[];
  timestamp: string;
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
    icon: AlertTriangle,
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
  if (diff < 0) {
    // Future time
    const absDiff = Math.abs(diff);
    if (absDiff < 3600000) return `in ${Math.floor(absDiff / 60000)}m`;
    if (absDiff < 86400000) return `in ${Math.floor(absDiff / 3600000)}h`;
    return `in ${Math.floor(absDiff / 86400000)}d`;
  }
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatSchedule(cron: string): string {
  const [minute, hour] = cron.split(" ");
  if (hour.startsWith("*/")) {
    return `Every ${hour.slice(2)}h at :${minute.padStart(2, "0")}`;
  }
  return `Daily at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")} UTC`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const REFRESH_INTERVAL_MS = 60_000;

export function CronMonitor() {
  const [jobs, setJobs] = useState<CronJobStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const fetchCrons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/crons");
      const data: CronResponse = await res.json();

      if (!res.ok) {
        throw new Error(
          (data as unknown as { error: string }).error ??
            "Failed to fetch cron status"
        );
      }

      setJobs(data.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load cron status";
      toast.error(message);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchCrons();
    const interval = setInterval(fetchCrons, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCrons]);

  const toggleError = (source: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  };

  if (initialLoad) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Loading cron status…
          </span>
        </CardContent>
      </Card>
    );
  }

  const failedCount = jobs.filter(
    (j) => j.lastRun?.status === "error"
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Cron Job Monitor
            </CardTitle>
            <CardDescription>
              {jobs.length} scheduled job{jobs.length !== 1 ? "s" : ""}
              {failedCount > 0 && (
                <span className="ml-1 text-destructive">
                  — {failedCount} failed
                </span>
              )}
              <span className="ml-1">· auto-refreshes every 60s</span>
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCrons}
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
        {jobs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No cron jobs configured.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Next Scheduled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const status = job.lastRun?.status;
                  const cfg = status ? STATUS_CONFIG[status] : null;
                  const StatusIcon = cfg?.icon;
                  const hasError = job.lastRun?.error_message;
                  const isExpanded = expandedErrors.has(job.source);

                  return (
                    <>
                      <TableRow
                        key={job.source}
                        className={
                          status === "error"
                            ? "bg-destructive/5"
                            : undefined
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {hasError && (
                              <button
                                type="button"
                                onClick={() => toggleError(job.source)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            <div>
                              <div className="font-medium text-sm">
                                {job.label}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {formatSchedule(job.schedule)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {cfg && StatusIcon ? (
                            <div className="flex items-center gap-1.5">
                              <StatusIcon
                                className={`h-3.5 w-3.5 ${cfg.color}`}
                              />
                              <Badge variant={cfg.badge} className="text-xs">
                                {cfg.label}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              No runs
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell
                          className="text-sm text-muted-foreground"
                          title={
                            job.lastRun
                              ? new Date(
                                  job.lastRun.started_at
                                ).toLocaleString()
                              : undefined
                          }
                        >
                          {job.lastRun
                            ? formatRelativeTime(job.lastRun.started_at)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {job.lastRun
                            ? formatDuration(
                                job.lastRun.started_at,
                                job.lastRun.finished_at
                              )
                            : "—"}
                        </TableCell>
                        <TableCell
                          className="text-sm text-muted-foreground"
                          title={
                            job.nextScheduled
                              ? new Date(
                                  job.nextScheduled
                                ).toLocaleString()
                              : undefined
                          }
                        >
                          {job.nextScheduled
                            ? formatRelativeTime(job.nextScheduled)
                            : "—"}
                        </TableCell>
                      </TableRow>
                      {hasError && isExpanded && (
                        <TableRow key={`${job.source}-error`}>
                          <TableCell
                            colSpan={5}
                            className="bg-destructive/5 px-6 py-3"
                          >
                            <div className="rounded-md bg-destructive/10 p-3 text-xs">
                              <span className="font-medium text-destructive">
                                Error:
                              </span>{" "}
                              <span className="text-destructive">
                                {job.lastRun?.error_message}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
