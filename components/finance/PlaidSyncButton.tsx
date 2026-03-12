"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function PlaidSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchLastSync = useCallback(async () => {
    try {
      const res = await fetch("/api/plaid/sync/status");
      if (!res.ok) return;
      const data = await res.json();
      setLastSync(data.lastSync ?? null);
    } catch {
      // Silently fail — last sync display is non-critical
    }
  }, []);

  useEffect(() => {
    fetchLastSync();
  }, [fetchLastSync]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Sync failed");
        return;
      }

      if (data.errors > 0) {
        toast.warning(
          `Synced ${data.synced} transaction${data.synced === 1 ? "" : "s"}, but ${data.errors} source${data.errors === 1 ? "" : "s"} had errors`
        );
      } else if (data.synced > 0) {
        toast.success(
          `Synced ${data.synced} transaction${data.synced === 1 ? "" : "s"}`
        );
      } else {
        toast.success("Transactions are up to date");
      }

      await fetchLastSync();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  function formatLastSync(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  return (
    <div className="flex items-center gap-2">
      {lastSync && (
        <span className="text-xs text-muted-foreground">
          Last sync: {formatLastSync(lastSync)}
        </span>
      )}
      <Button
        onClick={handleSync}
        disabled={syncing}
        variant="outline"
        size="sm"
      >
        {syncing ? (
          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="mr-1.5 size-3.5" />
        )}
        {syncing ? "Syncing…" : "Sync Transactions"}
      </Button>
    </div>
  );
}
