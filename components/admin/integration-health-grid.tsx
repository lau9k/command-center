"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  type IntegrationStatus,
  SyncStatusCard,
} from "@/components/admin/sync-status-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HealthReport {
  overall: "healthy" | "degraded" | "down";
  integrations: IntegrationStatus[];
  syncErrors24h: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IntegrationHealthGrid() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health/integrations");
      const data: HealthReport = await res.json();

      if (!res.ok) {
        throw new Error("Failed to fetch health report");
      }

      setReport(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load health data";
      toast.error(message);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleStatusUpdate = useCallback(
    (updated: IntegrationStatus) => {
      setReport((prev) => {
        if (!prev) return prev;
        const integrations = prev.integrations.map((i) =>
          i.id === updated.id ? updated : i,
        );
        const hasDown = integrations.some((i) => i.status === "down");
        const hasDegraded = integrations.some((i) => i.status === "degraded");
        const overall: HealthReport["overall"] = hasDown
          ? "down"
          : hasDegraded
            ? "degraded"
            : "healthy";
        return { ...prev, integrations, overall };
      });
    },
    [],
  );

  const overallConfig = {
    healthy: {
      icon: CheckCircle2,
      color: "text-green-500",
      label: "All Systems Operational",
      badge: "default" as const,
    },
    degraded: {
      icon: AlertTriangle,
      color: "text-yellow-500",
      label: "Partial Degradation",
      badge: "secondary" as const,
    },
    down: {
      icon: XCircle,
      color: "text-red-500",
      label: "System Issues Detected",
      badge: "destructive" as const,
    },
  };

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Loading integration health…
        </span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load health report. Check that the API is accessible.
      </div>
    );
  }

  const cfg = overallConfig[report.overall];
  const OverallIcon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* Overall status bar */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <OverallIcon className={`h-6 w-6 ${cfg.color}`} />
          <div>
            <div className="font-medium">{cfg.label}</div>
            <div className="text-sm text-muted-foreground">
              {report.integrations.length} integrations monitored
              {report.syncErrors24h > 0 && (
                <span className="ml-2 text-destructive">
                  — {report.syncErrors24h} sync errors (24h)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={cfg.badge}>{report.overall}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
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

      {/* Integration cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {report.integrations.map((integration) => (
          <SyncStatusCard
            key={integration.id}
            integration={integration}
            onStatusUpdate={handleStatusUpdate}
          />
        ))}
      </div>
    </div>
  );
}
