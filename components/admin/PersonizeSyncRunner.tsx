"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Play, Square, Upload } from "lucide-react";
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

interface SyncResponse {
  success: boolean;
  synced: number;
  failed: number;
  remaining: number;
  error?: string;
}

interface SyncStats {
  totalSynced: number;
  totalFailed: number;
  remaining: number;
  batchesCompleted: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PersonizeSyncRunner() {
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [initialRemaining, setInitialRemaining] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startSync = useCallback(async () => {
    setRunning(true);
    setStats(null);
    setInitialRemaining(null);

    const controller = new AbortController();
    abortRef.current = controller;

    let totalSynced = 0;
    let totalFailed = 0;
    let remaining = -1;
    let batchesCompleted = 0;
    let firstRemaining: number | null = null;

    try {
      while (!controller.signal.aborted) {
        const res = await fetch("/api/personize/sync-contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data.error ?? `Sync failed with status ${res.status}`
          );
        }

        const data: SyncResponse = await res.json();

        totalSynced += data.synced;
        totalFailed += data.failed;
        remaining = data.remaining;
        batchesCompleted++;

        if (firstRemaining === null) {
          firstRemaining = remaining + data.synced + data.failed;
          setInitialRemaining(firstRemaining);
        }

        setStats({ totalSynced, totalFailed, remaining, batchesCompleted });

        if (data.failed > 0) {
          toast.warning(
            `Batch ${batchesCompleted}: ${data.failed} contact(s) failed`
          );
        }

        if (remaining === 0) {
          toast.success(
            `Sync complete! ${totalSynced} contacts synced across ${batchesCompleted} batches.`
          );
          break;
        }

        // Rate limit: 500ms delay between calls
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        toast.info("Sync stopped by user");
      } else {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        toast.error(message);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [apiSecret]);

  const stopSync = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const progressPercent =
    stats && initialRemaining && initialRemaining > 0
      ? Math.round(
          ((initialRemaining - stats.remaining) / initialRemaining) * 100
        )
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" />
              Sync Contacts to Personize
            </CardTitle>
            <CardDescription>
              Batch-sync unmemorized contacts to Personize (50 per call)
            </CardDescription>
          </div>
          {running ? (
            <Button variant="destructive" onClick={stopSync}>
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button onClick={startSync} disabled={!apiSecret}>
              <Play className="mr-2 h-4 w-4" />
              Start Sync
            </Button>
          )}
        </div>
      </CardHeader>

      {(running || stats) && (
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {running ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Syncing…
                  </span>
                ) : (
                  "Complete"
                )}
              </span>
              <span className="font-mono text-muted-foreground">
                {progressPercent}%
              </span>
            </div>
            <Progress value={progressPercent} />
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalSynced.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Synced</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {stats.totalFailed.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {stats.remaining.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>
          )}

          {/* Batch count */}
          {stats && (
            <p className="text-xs text-muted-foreground text-center">
              {stats.batchesCompleted} batch{stats.batchesCompleted !== 1 ? "es" : ""}{" "}
              completed
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
