"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Mail,
  Calendar,
  Landmark,
  Brain,
  Workflow,
  Github,
  MessageSquare,
  Database,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntegrationStatus {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  latencyMs: number | null;
  lastChecked: string;
  error: string | null;
}

interface HealthResponse {
  overall: "healthy" | "degraded" | "down";
  integrations: IntegrationStatus[];
  timestamp: string;
  syncErrors24h: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INTEGRATION_ICONS: Record<string, React.ReactNode> = {
  supabase: <Database className="size-5" />,
  gmail: <Mail className="size-5" />,
  granola: <Calendar className="size-5" />,
  plaid: <Landmark className="size-5" />,
  personize: <Brain className="size-5" />,
  github: <Github className="size-5" />,
  n8n: <Workflow className="size-5" />,
  telegram: <MessageSquare className="size-5" />,
};

const STATUS_CONFIG: Record<
  IntegrationStatus["status"],
  {
    label: string;
    icon: React.ReactNode;
    badgeClass: string;
    dotClass: string;
  }
> = {
  healthy: {
    label: "Connected",
    icon: <CheckCircle className="size-3.5" />,
    badgeClass: "bg-green-500/20 text-green-500",
    dotClass: "bg-green-500",
  },
  degraded: {
    label: "Degraded",
    icon: <AlertTriangle className="size-3.5" />,
    badgeClass: "bg-yellow-500/20 text-yellow-500",
    dotClass: "bg-yellow-500",
  },
  down: {
    label: "Disconnected",
    icon: <XCircle className="size-3.5" />,
    badgeClass: "bg-red-500/20 text-red-500",
    dotClass: "bg-red-500",
  },
  unknown: {
    label: "Unknown",
    icon: <HelpCircle className="size-3.5" />,
    badgeClass: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Single Integration Card
// ---------------------------------------------------------------------------

function IntegrationCardItem({
  integration,
  onTestConnection,
  isTesting,
}: {
  integration: IntegrationStatus;
  onTestConnection: (id: string) => void;
  isTesting: boolean;
}) {
  const config = STATUS_CONFIG[integration.status];
  const icon = INTEGRATION_ICONS[integration.id] ?? <Database className="size-5" />;

  return (
    <Card className="gap-4 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {integration.name}
            </p>
            {integration.latencyMs !== null && (
              <p className="text-xs text-muted-foreground">
                {integration.latencyMs}ms latency
              </p>
            )}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}
        >
          {config.icon}
          {config.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground/70">Last Checked</p>
          <p className="font-mono">{formatTimestamp(integration.lastChecked)}</p>
        </div>
        <div>
          <p className="font-medium text-foreground/70">Errors</p>
          <p className="font-mono">
            {integration.error ? (
              <span className="text-red-500" title={integration.error}>
                1
              </span>
            ) : (
              "0"
            )}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        disabled={isTesting}
        onClick={() => onTestConnection(integration.id)}
      >
        {isTesting ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3.5" />
        )}
        Test Connection
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Integration Health Grid
// ---------------------------------------------------------------------------

export function IntegrationHealthGrid() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health/integrations");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: HealthResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleTestConnection = useCallback(
    async (id: string) => {
      setTestingIds((prev) => new Set(prev).add(id));
      try {
        // Re-fetch health data to test the connection
        const res = await fetch("/api/admin/health/integrations");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: HealthResponse = await res.json();
        setData(json);
      } finally {
        setTestingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <XCircle className="mx-auto size-8 text-red-500" />
        <p className="mt-2 text-sm text-foreground">
          Failed to load integration health
        </p>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchHealth}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const overallConfig = STATUS_CONFIG[data.overall];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${overallConfig.badgeClass}`}
          >
            <span className={`size-2 rounded-full ${overallConfig.dotClass}`} />
            Overall: {overallConfig.label}
          </span>
          {data.syncErrors24h > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-red-500">
              <AlertTriangle className="size-3.5" />
              {data.syncErrors24h} sync error{data.syncErrors24h !== 1 ? "s" : ""} (24h)
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchHealth}
          className="gap-1.5"
        >
          <RefreshCw className="size-3.5" />
          Refresh All
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {data.integrations.map((integration) => (
          <IntegrationCardItem
            key={integration.id}
            integration={integration}
            onTestConnection={handleTestConnection}
            isTesting={testingIds.has(integration.id)}
          />
        ))}
      </div>
    </div>
  );
}
