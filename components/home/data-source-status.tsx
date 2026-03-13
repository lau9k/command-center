"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  Calendar,
  Landmark,
  Brain,
  Workflow,
  RefreshCw,
  Loader2,
  Database,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DataSource {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "error";
  lastSync: string | null;
  recordCount: number;
}

type SyncHealth = "green" | "yellow" | "red";

const ICONS: Record<string, React.ReactNode> = {
  gmail: <Mail className="size-4" />,
  granola: <Calendar className="size-4" />,
  plaid: <Landmark className="size-4" />,
  personize: <Brain className="size-4" />,
  n8n: <Workflow className="size-4" />,
};

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function getSyncHealth(source: DataSource): SyncHealth {
  if (source.status === "disconnected" || source.status === "error") return "red";
  if (!source.lastSync) return "red";
  const age = Date.now() - new Date(source.lastSync).getTime();
  if (age < TWENTY_FOUR_HOURS) return "green";
  if (age < SEVEN_DAYS) return "yellow";
  return "red";
}

const HEALTH_STYLES: Record<SyncHealth, { dot: string; bg: string }> = {
  green: { dot: "bg-green-500", bg: "bg-green-500/10" },
  yellow: { dot: "bg-yellow-500", bg: "bg-yellow-500/10" },
  red: { dot: "bg-red-500", bg: "bg-red-500/10" },
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function DataSourceStatus() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSources = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/data-sources");
      const json: { data?: DataSource[] } = await res.json();
      setSources(json.data ?? []);
    } catch {
      setSources([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const connectedCount = sources.filter((s) => s.status === "connected").length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="size-5 text-muted-foreground" />
          <CardTitle className="text-base">Data Sources</CardTitle>
          {!loading && (
            <span className="text-xs text-muted-foreground">
              {connectedCount}/{sources.length} connected
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchSources(true)}
          disabled={refreshing}
          className="size-8 p-0"
        >
          <RefreshCw
            className={`size-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => {
              const health = getSyncHealth(source);
              const styles = HEALTH_STYLES[health];
              const isDisconnected = source.status === "disconnected";

              return (
                <div
                  key={source.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  {/* Status dot */}
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${styles.bg}`}
                  >
                    <div className="text-foreground">
                      {ICONS[source.id] ?? <Database className="size-4" />}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`size-2 shrink-0 rounded-full ${styles.dot}`}
                      />
                      <span className="truncate text-sm font-medium text-foreground">
                        {source.name}
                      </span>
                    </div>
                    {isDisconnected ? (
                      <Link
                        href="/settings/data-sources"
                        className="mt-0.5 flex items-center gap-1 text-xs text-blue-500 hover:underline"
                      >
                        Connect
                        <ExternalLink className="size-3" />
                      </Link>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatRelativeTime(source.lastSync)} &middot;{" "}
                        {source.recordCount.toLocaleString()} records
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
