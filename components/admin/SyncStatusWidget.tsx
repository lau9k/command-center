"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Loader2,
  MinusCircle,
  RefreshCw,
  RotateCcw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type SyncStatus = "pending" | "synced" | "failed" | "skipped";

type TableSyncCounts = Record<SyncStatus, number>;

type SyncStatusData = Record<string, TableSyncCounts>;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TABLE_DISPLAY_NAMES: Record<string, string> = {
  contacts: "Contacts",
  tasks: "Tasks",
  pipeline_items: "Pipeline Items",
  content_posts: "Content Posts",
  meetings: "Meetings",
};

const STATUS_CONFIG: Record<
  SyncStatus,
  {
    icon: typeof Check;
    className: string;
    badgeClass: string;
  }
> = {
  synced: {
    icon: Check,
    className: "text-green-500",
    badgeClass: "bg-green-500/15 text-green-600 dark:text-green-400",
  },
  pending: {
    icon: Zap,
    className: "text-yellow-500",
    badgeClass: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  },
  failed: {
    icon: AlertCircle,
    className: "text-red-500",
    badgeClass: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
  skipped: {
    icon: MinusCircle,
    className: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SyncStatusSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function StatusBadge({
  status,
  count,
}: {
  status: SyncStatus;
  count: number;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}
    >
      <Icon className="h-3 w-3" />
      {count.toLocaleString()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SyncStatusWidget() {
  const [data, setData] = useState<SyncStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setHasError(false);
      const res = await fetch("/api/admin/sync-status");
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error ?? "Failed to fetch sync status");
      setData(json.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch sync status";
      toast.error(message);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  const totalFailed = data
    ? Object.values(data).reduce((sum, counts) => sum + counts.failed, 0)
    : 0;

  const handleRetryFailed = useCallback(async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/admin/sync-status", { method: "POST" });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error ?? "Failed to retry failed syncs");

      const total = Object.values(json.data.retried as Record<string, number>).reduce(
        (sum, n) => sum + n,
        0
      );
      toast.success(`Re-queued ${total} failed record${total !== 1 ? "s" : ""}`);

      // Refresh counts
      await fetchStatus();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to retry failed syncs";
      toast.error(message);
    } finally {
      setRetrying(false);
    }
  }, [fetchStatus]);

  if (loading && !data) {
    return <SyncStatusSkeleton />;
  }

  if (hasError && !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Failed to load sync status
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Personize Sync Status</CardTitle>
            <CardDescription>
              Record sync counts across all tables
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryFailed}
              disabled={retrying || totalFailed === 0}
            >
              {retrying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Retry Failed{totalFailed > 0 ? ` (${totalFailed})` : ""}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead className="text-center">Pending</TableHead>
                <TableHead className="text-center">Synced</TableHead>
                <TableHead className="text-center">Failed</TableHead>
                <TableHead className="text-center">Skipped</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data &&
                Object.entries(data).map(([table, counts]) => {
                  const total =
                    counts.pending +
                    counts.synced +
                    counts.failed +
                    counts.skipped;

                  return (
                    <TableRow key={table}>
                      <TableCell className="font-medium">
                        {TABLE_DISPLAY_NAMES[table] ?? table}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status="pending" count={counts.pending} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status="synced" count={counts.synced} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status="failed" count={counts.failed} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status="skipped" count={counts.skipped} />
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
