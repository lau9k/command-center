"use client";

import { useCallback, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Loader2,
  Zap,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntegrationStatus {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  latencyMs: number | null;
  lastChecked: string;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle2,
    color: "text-green-500",
    dot: "bg-green-500",
    badge: "default" as const,
    label: "Healthy",
  },
  degraded: {
    icon: AlertTriangle,
    color: "text-yellow-500",
    dot: "bg-yellow-500",
    badge: "secondary" as const,
    label: "Degraded",
  },
  down: {
    icon: XCircle,
    color: "text-red-500",
    dot: "bg-red-500",
    badge: "destructive" as const,
    label: "Down",
  },
  unknown: {
    icon: HelpCircle,
    color: "text-muted-foreground",
    dot: "bg-muted-foreground",
    badge: "secondary" as const,
    label: "Unknown",
  },
};

function formatLatency(ms: number | null): string {
  if (ms === null) return "N/A";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SyncStatusCardProps {
  integration: IntegrationStatus;
  onStatusUpdate?: (updated: IntegrationStatus) => void;
}

export function SyncStatusCard({ integration, onStatusUpdate }: SyncStatusCardProps) {
  const [testing, setTesting] = useState(false);
  const config = STATUS_CONFIG[integration.status];
  const StatusIcon = config.icon;

  const testConnection = useCallback(async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/health/integrations");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Health check failed");
      }

      const updated = (data.integrations as IntegrationStatus[]).find(
        (i) => i.id === integration.id,
      );

      if (updated) {
        onStatusUpdate?.(updated);
        if (updated.status === "healthy") {
          toast.success(`${integration.name} is healthy`);
        } else if (updated.status === "degraded") {
          toast.warning(`${integration.name} is degraded`);
        } else {
          toast.error(`${integration.name} is ${updated.status}`);
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Connection test failed";
      toast.error(message);
    } finally {
      setTesting(false);
    }
  }, [integration.id, integration.name, onStatusUpdate]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${config.dot}`}
            />
            <CardTitle className="text-base">{integration.name}</CardTitle>
          </div>
          <Badge variant={config.badge}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Status</div>
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`h-3.5 w-3.5 ${config.color}`} />
            {config.label}
          </div>

          <div className="text-muted-foreground">Latency</div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            {formatLatency(integration.latencyMs)}
          </div>

          <div className="text-muted-foreground">Last Checked</div>
          <div>{formatTimestamp(integration.lastChecked)}</div>
        </div>

        {integration.error && (
          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {integration.error}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={testConnection}
          disabled={testing}
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Testing…
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Test Connection
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
