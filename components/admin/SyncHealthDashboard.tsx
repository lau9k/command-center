"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRightLeft,
  Brain,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldCoverage {
  email: number;
  company: number;
  role: number;
  linkedin_url: number;
  phone: number;
}

interface MemoryDistribution {
  rich: number;
  some: number;
  none: number;
}

interface SyncHealthData {
  total_contacts: number;
  synced_contacts: number;
  failed_contacts: number;
  last_sync_at: string | null;
  field_coverage: FieldCoverage;
  memory_distribution: MemoryDistribution;
}

interface SyncResponse {
  success: boolean;
  synced: number;
  failed: number;
  remaining: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIELD_LABELS: Record<keyof FieldCoverage, string> = {
  email: "Email",
  company: "Company",
  role: "Job Title",
  linkedin_url: "LinkedIn URL",
  phone: "Phone",
};

function coverageColor(pct: number): string {
  if (pct >= 90) return "bg-green-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function coverageTextColor(pct: number): string {
  if (pct >= 90) return "text-green-600 dark:text-green-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function connectionStatusColor(pct: number): string {
  if (pct >= 95) return "bg-green-500";
  if (pct >= 80) return "bg-amber-500";
  return "bg-red-500";
}

function connectionStatusLabel(pct: number): string {
  if (pct >= 95) return "Healthy";
  if (pct >= 80) return "Degraded";
  return "Critical";
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function fetchSyncHealth(): Promise<SyncHealthData> {
  const res = await fetch("/api/admin/sync-health-dashboard");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to fetch sync health");
  return json.data;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SyncHealthDashboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sync-health-dashboard"],
    queryFn: fetchSyncHealth,
    refetchInterval: 30_000,
  });

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    synced: number;
    failed: number;
    remaining: number;
    batches: number;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleResync = useCallback(async () => {
    setSyncing(true);
    setSyncProgress(null);

    const controller = new AbortController();
    abortRef.current = controller;

    let totalSynced = 0;
    let totalFailed = 0;
    let remaining = -1;
    let batches = 0;

    try {
      while (!controller.signal.aborted) {
        const res = await fetch("/api/personize/sync-contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `Sync failed: ${res.status}`);
        }

        const result: SyncResponse = await res.json();
        totalSynced += result.synced;
        totalFailed += result.failed;
        remaining = result.remaining;
        batches++;

        setSyncProgress({ synced: totalSynced, failed: totalFailed, remaining, batches });

        if (remaining === 0) {
          toast.success(`Resync complete — ${totalSynced} contacts synced`);
          break;
        }

        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const msg = err instanceof Error ? err.message : "Sync failed";
        toast.error(msg);
      }
    } finally {
      setSyncing(false);
      abortRef.current = null;
      refetch();
    }
  }, [apiSecret, refetch]);

  const stopSync = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Failed to load sync health data</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const syncPct =
    data.total_contacts > 0
      ? Math.round((data.synced_contacts / data.total_contacts) * 100)
      : 0;

  const memTotal =
    data.memory_distribution.rich +
    data.memory_distribution.some +
    data.memory_distribution.none;
  const memRichPct = memTotal > 0 ? (data.memory_distribution.rich / memTotal) * 100 : 0;
  const memSomePct = memTotal > 0 ? (data.memory_distribution.some / memTotal) * 100 : 0;
  const memNonePct = memTotal > 0 ? (data.memory_distribution.none / memTotal) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowRightLeft className="h-5 w-5" />
              Sync Health Dashboard
            </CardTitle>
            <CardDescription>
              Dual-write coverage between Supabase and Personize
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Connection Status ────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${connectionStatusColor(syncPct)}`}
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                Supabase → Personize
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    syncPct >= 95
                      ? "bg-green-500/15 text-green-600 dark:text-green-400"
                      : syncPct >= 80
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                  }`}
                >
                  {connectionStatusLabel(syncPct)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {data.synced_contacts.toLocaleString()} /{" "}
                {data.total_contacts.toLocaleString()} contacts synced ({syncPct}
                %)
                {data.failed_contacts > 0 && (
                  <span className="ml-2 text-red-500">
                    · {data.failed_contacts} failed
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {data.last_sync_at ? (
              <>Last sync: {formatRelativeTime(data.last_sync_at)}</>
            ) : (
              "Never synced"
            )}
          </div>
        </div>

        {/* ── Data Quality Bars ───────────────────────────────── */}
        <div>
          <h3 className="mb-3 text-sm font-medium">Field Coverage</h3>
          <div className="space-y-3">
            {(Object.entries(FIELD_LABELS) as [keyof FieldCoverage, string][]).map(
              ([field, label]) => {
                const pct = data.field_coverage[field];
                return (
                  <div key={field} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`font-mono font-medium ${coverageTextColor(pct)}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${coverageColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* ── Memory Coverage ─────────────────────────────────── */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4" />
            Memory Richness
          </h3>
          {/* Stacked bar */}
          <div className="mb-2 flex h-4 w-full overflow-hidden rounded-full">
            {memRichPct > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${memRichPct}%` }}
              />
            )}
            {memSomePct > 0 && (
              <div
                className="bg-amber-500 transition-all"
                style={{ width: `${memSomePct}%` }}
              />
            )}
            {memNonePct > 0 && (
              <div
                className="bg-muted transition-all"
                style={{ width: `${memNonePct}%` }}
              />
            )}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Rich (10+): {data.memory_distribution.rich.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Some (1–9): {data.memory_distribution.some.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              None: {data.memory_distribution.none.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ── Resync Button ───────────────────────────────────── */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Trigger Resync</div>
              <div className="text-xs text-muted-foreground">
                Push unsynced contacts to Personize in batches of 50
              </div>
            </div>
            {syncing ? (
              <Button variant="destructive" size="sm" onClick={stopSync}>
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={handleResync} disabled={!apiSecret}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resync
              </Button>
            )}
          </div>

          {/* Sync progress */}
          {(syncing || syncProgress) && syncProgress && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  {syncing && <Loader2 className="h-3 w-3 animate-spin" />}
                  {syncing ? "Syncing…" : "Complete"}
                </span>
                <span>
                  {syncProgress.synced} synced · {syncProgress.failed} failed ·{" "}
                  {syncProgress.remaining} remaining
                </span>
              </div>
              <Progress
                value={
                  syncProgress.synced + syncProgress.failed + syncProgress.remaining > 0
                    ? Math.round(
                        ((syncProgress.synced + syncProgress.failed) /
                          (syncProgress.synced +
                            syncProgress.failed +
                            syncProgress.remaining)) *
                          100
                      )
                    : 0
                }
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
