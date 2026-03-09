"use client";

import { useEffect, useState } from "react";
import { MessageCircle, RefreshCw, Users, Activity, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HealthData {
  status: "online" | "degraded" | "offline";
  reason?: string;
  memberCount: number;
  webhookUrl: string | null;
  lastErrorDate: string | null;
  lastErrorMessage: string | null;
  pendingUpdateCount: number;
  checkedAt: string;
}

const STATUS_CONFIG = {
  online: { label: "Online", dotClass: "bg-green-500", textClass: "text-green-500" },
  degraded: { label: "Degraded", dotClass: "bg-yellow-500", textClass: "text-yellow-500" },
  offline: { label: "Offline", dotClass: "bg-red-500", textClass: "text-red-500" },
} as const;

export function TelegramHealthCard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchHealth() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/health");
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({
        status: "offline",
        reason: "Failed to reach health endpoint",
        memberCount: 0,
        webhookUrl: null,
        lastErrorDate: null,
        lastErrorMessage: null,
        pendingUpdateCount: 0,
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  const statusConfig = health ? STATUS_CONFIG[health.status] : STATUS_CONFIG.offline;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-[#0088CC]" />
          <h2 className="text-sm font-semibold text-foreground">Telegram Bot</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={fetchHealth}
          disabled={loading}
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && !health ? (
        <div className="flex h-20 items-center justify-center">
          <RefreshCw className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Status */}
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Activity className="size-4" />
              Status
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block size-2.5 rounded-full ${statusConfig.dotClass}`} />
              <span className={`text-lg font-bold ${statusConfig.textClass}`}>
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {health?.webhookUrl ? "Webhook active" : "No webhook"}
            </p>
          </div>

          {/* Member Count */}
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="size-4" />
              Members
            </div>
            <p className="text-lg font-bold text-foreground">
              {health?.memberCount ? health.memberCount.toLocaleString() : "—"}
            </p>
            <p className="text-xs text-muted-foreground">community size</p>
          </div>

          {/* Pending Updates */}
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageCircle className="size-4" />
              Pending
            </div>
            <p className="text-lg font-bold text-foreground">
              {health?.pendingUpdateCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">queued updates</p>
          </div>

          {/* Last Error */}
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <AlertTriangle className="size-4" />
              Last Error
            </div>
            <p className="text-lg font-bold text-foreground">
              {health?.lastErrorDate ? "Yes" : "None"}
            </p>
            <p className="truncate text-xs text-muted-foreground" title={health?.lastErrorMessage ?? undefined}>
              {health?.lastErrorDate
                ? new Date(health.lastErrorDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "No errors"}
            </p>
          </div>
        </div>
      )}

      {health?.checkedAt && (
        <p className="mt-3 text-xs text-muted-foreground">
          Last checked:{" "}
          {new Date(health.checkedAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
