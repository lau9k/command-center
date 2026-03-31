"use client";

import { useEffect, useState } from "react";
import { GitPullRequest, RefreshCw, GitCommit, Activity, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GitHubStatsData {
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  mergeRate: number;
  lastCommitSha: string | null;
  lastCommitMessage: string | null;
  lastCommitDate: string | null;
  buildStatus: "success" | "failure" | "pending" | "unknown";
  fetchedAt: string;
  source: string;
}

const BUILD_STATUS_CONFIG = {
  success: { label: "Passing", dotClass: "bg-green-500", textClass: "text-green-500" },
  failure: { label: "Failing", dotClass: "bg-red-500", textClass: "text-red-500" },
  pending: { label: "Pending", dotClass: "bg-yellow-500", textClass: "text-yellow-500" },
  unknown: { label: "Unknown", dotClass: "bg-gray-500", textClass: "text-gray-500" },
} as const;

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function GitHubActivityCard() {
  const [stats, setStats] = useState<GitHubStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/github/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setStats(null);
      }
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  const buildConfig = stats
    ? BUILD_STATUS_CONFIG[stats.buildStatus]
    : BUILD_STATUS_CONFIG.unknown;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitPullRequest className="size-4 text-purple-500 dark:text-purple-400" />
          <h2 className="text-sm font-semibold text-foreground">GitHub Activity</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={fetchStats}
          disabled={loading}
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading && !stats ? (
        <div className="flex h-20 items-center justify-center">
          <RefreshCw className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : !stats ? (
        <p className="text-sm text-muted-foreground">
          Unable to load GitHub stats. Check your GITHUB_TOKEN configuration.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* PRs Merged */}
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <GitPullRequest className="size-4" />
              PRs Merged
            </div>
            <p className="text-lg font-bold text-foreground">
              {stats.mergedPRs}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.openPRs} open · {stats.mergeRate}% merge rate
            </p>
          </div>

          {/* Build Status */}
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CircleDot className="size-4" />
              Build
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-block size-2.5 rounded-full ${buildConfig.dotClass}`} />
              <span className={`text-lg font-bold ${buildConfig.textClass}`}>
                {buildConfig.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">latest CI run</p>
          </div>

          {/* Last Commit */}
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <GitCommit className="size-4" />
              Last Commit
            </div>
            <p className="text-lg font-bold text-foreground">
              {stats.lastCommitDate ? formatRelativeTime(stats.lastCommitDate) : "—"}
            </p>
            <p className="truncate text-xs text-muted-foreground" title={stats.lastCommitMessage ?? undefined}>
              {stats.lastCommitMessage
                ? stats.lastCommitMessage.split("\n")[0].slice(0, 60)
                : "No commits"}
            </p>
          </div>

          {/* Last Deploy */}
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Activity className="size-4" />
              Activity
            </div>
            <p className="text-lg font-bold text-foreground">
              {stats.totalPRs}
            </p>
            <p className="text-xs text-muted-foreground">total PRs</p>
          </div>
        </div>
      )}

      {stats?.fetchedAt && (
        <p className="mt-3 text-xs text-muted-foreground">
          Last checked:{" "}
          {new Date(stats.fetchedAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
          {stats.source !== "live" && ` (${stats.source})`}
        </p>
      )}
    </div>
  );
}
