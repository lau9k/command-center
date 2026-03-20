"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Loader2,
  RefreshCw,
  Linkedin,
  Mail,
  Github,
  MessageCircle,
  Mic,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncSource {
  id: string;
  source: string;
  display_name: string;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  error_count_24h: number;
  backoff_until: string | null;
  status: "healthy" | "degraded" | "failing" | "unknown";
  sync_frequency_minutes: number | null;
  is_stale: boolean;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  healthy: {
    dot: "bg-green-500",
    badge: "default" as const,
    label: "Healthy",
    icon: CheckCircle2,
  },
  degraded: {
    dot: "bg-yellow-500",
    badge: "secondary" as const,
    label: "Degraded",
    icon: AlertTriangle,
  },
  failing: {
    dot: "bg-red-500",
    badge: "destructive" as const,
    label: "Failing",
    icon: XCircle,
  },
  unknown: {
    dot: "bg-muted-foreground",
    badge: "secondary" as const,
    label: "Unknown",
    icon: HelpCircle,
  },
};

const SOURCE_ICONS: Record<string, typeof Linkedin> = {
  linkedin: Linkedin,
  gmail: Mail,
  github: Github,
  telegram: MessageCircle,
  granola: Mic,
  personize: Users,
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SyncHealthWidget() {
  const [sources, setSources] = useState<SyncSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sync-health");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch sync health");
      setSources(json.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch sync health";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    await fetchSources();
    toast.success("Sync health refreshed");
  }, [fetchSources]);

  if (loading && sources.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Data Source Health</CardTitle>
            <CardDescription>
              Live sync status for connected integrations
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sources.map((source) => {
            const config = STATUS_CONFIG[source.status];
            const SourceIcon = SOURCE_ICONS[source.source] ?? HelpCircle;
            const isExpanded = expandedSource === source.source;

            return (
              <button
                key={source.id}
                type="button"
                className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                onClick={() =>
                  setExpandedSource(isExpanded ? null : source.source)
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`}
                  />
                  <SourceIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">
                    {source.display_name}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <Badge variant={config.badge} className="text-xs">
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(source.last_success_at)}
                  </span>
                </div>

                {source.error_count_24h > 0 && (
                  <div className="mt-1.5 text-xs text-destructive">
                    {source.error_count_24h} error
                    {source.error_count_24h !== 1 ? "s" : ""} (24h)
                  </div>
                )}

                {isExpanded && source.last_error_message && (
                  <div className="mt-2 rounded bg-destructive/10 p-2 text-xs text-destructive">
                    {source.last_error_message}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
