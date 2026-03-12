"use client";

import { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyncLogEntry } from "./SyncSourceCards";

const SOURCES = ["plaid", "personize"] as const;
const STATUSES = ["success", "error", "partial", "running"] as const;

interface SyncHistoryTableProps {
  entries: SyncLogEntry[];
  source: string;
  status: string;
  onSourceChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

const STATUS_STYLES: Record<string, { icon: React.ReactNode; badge: string }> = {
  success: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" />,
    badge: "bg-[#22C55E]/10 text-[#22C55E]",
  },
  error: {
    icon: <AlertCircle className="h-3.5 w-3.5 text-[#EF4444]" />,
    badge: "bg-[#EF4444]/10 text-[#EF4444]",
  },
  partial: {
    icon: <Clock className="h-3.5 w-3.5 text-[#F59E0B]" />,
    badge: "bg-[#F59E0B]/10 text-[#F59E0B]",
  },
  running: {
    icon: <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#6366f1]" />,
    badge: "bg-[#6366f1]/10 text-[#6366f1]",
  },
};

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "running...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export function SyncHistoryTable({
  entries,
  source,
  status,
  onSourceChange,
  onStatusChange,
  loading,
  hasMore,
  onLoadMore,
}: SyncHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <Filter className="h-4 w-4 text-muted-foreground" />

        <select
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">All sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {(source || status) && (
          <button
            onClick={() => {
              onSourceChange("");
              onStatusChange("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="w-8 px-3 py-2.5" />
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                Source
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                Records
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                Started
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                Duration
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-muted-foreground">
                  No sync history found
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const expanded = expandedId === entry.id;
                const hasError = entry.error_message || entry.status === "error";
                const style = STATUS_STYLES[entry.status] ?? STATUS_STYLES.success;

                return (
                  <RowGroup key={entry.id}>
                    <tr
                      onClick={() =>
                        hasError
                          ? setExpandedId(expanded ? null : entry.id)
                          : undefined
                      }
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        hasError && "cursor-pointer"
                      )}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {hasError ? (
                          expanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        {entry.source.charAt(0).toUpperCase() +
                          entry.source.slice(1)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                            style.badge
                          )}
                        >
                          {style.icon}
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                        {entry.records_synced ?? entry.record_count}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {formatDateTime(entry.started_at)}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {formatDuration(entry.started_at, entry.completed_at)}
                      </td>
                    </tr>
                    {expanded && entry.error_message && (
                      <tr>
                        <td colSpan={6} className="bg-[#EF4444]/5 px-6 py-3">
                          <p className="text-xs font-medium text-[#EF4444]">
                            Error details
                          </p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {entry.error_message}
                          </p>
                        </td>
                      </tr>
                    )}
                  </RowGroup>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Load More */}
      {hasMore && entries.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Fragment wrapper to group main row + error expansion row */
function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
