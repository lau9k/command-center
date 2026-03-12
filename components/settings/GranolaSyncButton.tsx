"use client";

import { useState } from "react";
import { Calendar, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SyncResult {
  success: boolean;
  synced: number;
  skipped: number;
  errors: number;
}

export function GranolaSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/sync/granola", { method: "POST" });
      const data: SyncResult = await res.json();
      setResult(data);
      setLastSyncAt(new Date().toLocaleTimeString());
    } catch {
      setResult({ success: false, synced: 0, skipped: 0, errors: 1 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSync}
        disabled={loading}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Calendar className="h-4 w-4" />
        )}
        {loading ? "Syncing..." : "Sync Meetings"}
      </Button>

      {result && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {result.success ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span>
            {result.synced} synced, {result.skipped} skipped
            {result.errors > 0 && `, ${result.errors} errors`}
          </span>
        </div>
      )}

      {lastSyncAt && (
        <p className="text-xs text-muted-foreground">
          Last sync: {lastSyncAt}
        </p>
      )}
    </div>
  );
}
