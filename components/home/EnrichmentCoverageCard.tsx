"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  Linkedin,
  Inbox,
  Sparkles,
  Users,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import type { EnrichmentStats } from "@/app/api/contacts/enrichment-stats/route";

interface CoverageBar {
  label: string;
  icon: React.ReactNode;
  count: number;
  total: number;
}

function getBarColor(pct: number): string {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function getBarBg(pct: number): string {
  if (pct >= 80) return "bg-green-500/15";
  if (pct >= 50) return "bg-yellow-500/15";
  return "bg-red-500/15";
}

function getTextColor(pct: number): string {
  if (pct >= 80) return "text-green-600 dark:text-green-400";
  if (pct >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

interface EnrichmentCoverageCardProps {
  initial?: EnrichmentStats | null;
}

export function EnrichmentCoverageCard({
  initial,
}: EnrichmentCoverageCardProps) {
  const [stats, setStats] = useState<EnrichmentStats | null>(initial ?? null);
  const [isLoading, setIsLoading] = useState(!initial);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/contacts/enrichment-stats");
      if (res.ok) {
        const json = (await res.json()) as { data: EnrichmentStats };
        setStats(json.data);
        setHasError(false);
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initial) fetchStats();
  }, [initial, fetchStats]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded bg-muted" />
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (hasError && !stats) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="size-5" />
          <span className="text-sm">Enrichment data unavailable</span>
          <button
            type="button"
            onClick={fetchStats}
            className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="size-5" />
          <span className="text-sm font-medium">Enrichment Coverage</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          No contacts found in Personize collection.
        </p>
      </div>
    );
  }

  const bars: CoverageBar[] = [
    {
      label: "Email",
      icon: <Mail className="size-4" />,
      count: stats.has_email,
      total: stats.total,
    },
    {
      label: "LinkedIn",
      icon: <Linkedin className="size-4" />,
      count: stats.has_linkedin,
      total: stats.total,
    },
    {
      label: "Gmail Context",
      icon: <Inbox className="size-4" />,
      count: stats.has_gmail,
      total: stats.total,
    },
    {
      label: "Apollo",
      icon: <Sparkles className="size-4" />,
      count: stats.has_apollo,
      total: stats.total,
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-indigo-500" />
          <h3 className="text-sm font-semibold text-foreground">
            Enrichment Coverage
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {hasError && (
            <span className="text-xs text-destructive">stale</span>
          )}
          {isRefreshing ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <button
              type="button"
              onClick={fetchStats}
              className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:size-auto sm:p-1"
              aria-label="Refresh enrichment stats"
            >
              <RefreshCw className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-foreground">
          {stats.total.toLocaleString()}
        </span>
        <span className="text-sm text-muted-foreground">total contacts</span>
      </div>

      <div className="mt-4 space-y-3">
        {bars.map((bar) => {
          const pct = Math.round((bar.count / bar.total) * 100);
          return (
            <div key={bar.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  {bar.icon}
                  <span>{bar.label}</span>
                </div>
                <span className={`font-medium tabular-nums ${getTextColor(pct)}`}>
                  {bar.count.toLocaleString()} ({pct}%)
                </span>
              </div>
              <div
                className={`h-2 w-full overflow-hidden rounded-full ${getBarBg(pct)}`}
              >
                <div
                  className={`h-full rounded-full transition-all ${getBarColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
