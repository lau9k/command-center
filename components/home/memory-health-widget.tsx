"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Loader2 } from "lucide-react";

interface MemoryHealthData {
  totalRecords: number;
  recordsSynced: number;
  lastSyncTime: string | null;
  status: "healthy" | "degraded" | "error";
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "#22C55E",
  degraded: "#EAB308",
  error: "#EF4444",
};

function formatSyncTime(iso: string | null): string {
  if (!iso) return "never";
  const seconds = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function MemoryHealthWidget() {
  const [data, setData] = useState<MemoryHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/home-stats");
      if (res.ok) {
        const json = (await res.json()) as {
          data: { memoryRecords: number; lastUpdated: string };
        };
        const records = json.data.memoryRecords ?? 0;
        setData({
          totalRecords: records,
          recordsSynced: records,
          lastSyncTime: json.data.lastUpdated,
          status: records > 0 ? "healthy" : "degraded",
        });
      } else {
        setData({
          totalRecords: 0,
          recordsSynced: 0,
          lastSyncTime: null,
          status: "error",
        });
      }
    } catch {
      setData({
        totalRecords: 0,
        recordsSynced: 0,
        lastSyncTime: null,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 120_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Checking memory health...
        </span>
      </div>
    );
  }

  if (!data) return null;

  const statusColor = STATUS_COLORS[data.status];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <Brain className="size-4 text-[#A855F7]" />

      {/* Status dot */}
      <div
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: statusColor }}
        title={`Memory status: ${data.status}`}
      />

      <div className="flex flex-1 items-center gap-3 text-xs">
        <span className="text-foreground font-medium">
          {data.recordsSynced.toLocaleString()} records
        </span>
        <span className="text-muted-foreground">
          synced {formatSyncTime(data.lastSyncTime)}
        </span>
      </div>

      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          backgroundColor: `${statusColor}15`,
          color: statusColor,
        }}
      >
        {data.status}
      </span>
    </div>
  );
}
