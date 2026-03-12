"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Calendar,
  Linkedin,
  Landmark,
  Brain,
  Workflow,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataSource {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "error";
  lastSync: string | null;
  recordCount: number;
}

const ICONS: Record<string, React.ReactNode> = {
  gmail: <Mail className="h-5 w-5" />,
  granola: <Calendar className="h-5 w-5" />,
  linkedin: <Linkedin className="h-5 w-5" />,
  plaid: <Landmark className="h-5 w-5" />,
  personize: <Brain className="h-5 w-5" />,
  n8n: <Workflow className="h-5 w-5" />,
};

const STATUS_CONFIG = {
  connected: { label: "Connected", variant: "default" as const },
  disconnected: { label: "Disconnected", variant: "secondary" as const },
  error: { label: "Error", variant: "destructive" as const },
};

function formatLastSync(dateStr: string | null): string {
  if (!dateStr) return "Never";
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

export function DataSourcesPanel() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data-sources");
      const json = await res.json();
      setSources(json.data ?? []);
    } catch {
      setSources([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sources.filter((s) => s.status === "connected").length} of{" "}
          {sources.length} sources connected
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSources}
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((source) => {
          const config = STATUS_CONFIG[source.status];
          return (
            <div
              key={source.id}
              className="rounded-lg border border-border p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                    {ICONS[source.id]}
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {source.name}
                  </p>
                </div>
                <Badge variant={config.variant} className="text-xs">
                  {config.label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground/70">Last Sync</p>
                  <p className="font-mono">
                    {formatLastSync(source.lastSync)}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-foreground/70">Records</p>
                  <p className="font-mono">
                    {source.recordCount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
