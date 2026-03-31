"use client";

import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  CreditCard,
  UserSearch,
} from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { cn } from "@/lib/utils";

interface SyncLogEntry {
  id: string;
  source: string;
  status: "success" | "error" | "partial" | "running";
  record_count: number;
  records_synced: number;
  message: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  synced_at: string;
  created_at: string;
}

interface SourceStats {
  source: string;
  lastSync: string | null;
  lastStatus: "success" | "error" | "partial" | "running";
  totalSyncs: number;
  totalRecords: number;
  errorCount: number;
}

interface SyncSourceCardsProps {
  entries: SyncLogEntry[];
  onTriggerSync: (source: string) => void;
  syncingSource: string | null;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  plaid: <CreditCard className="h-4 w-4" />,
  personize: <UserSearch className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  success: "text-green-500",
  error: "text-red-500",
  partial: "text-amber-500",
  running: "text-indigo-500",
};

function computeSourceStats(entries: SyncLogEntry[]): SourceStats[] {
  const grouped = new Map<string, SyncLogEntry[]>();

  for (const entry of entries) {
    const list = grouped.get(entry.source) ?? [];
    list.push(entry);
    grouped.set(entry.source, list);
  }

  const stats: SourceStats[] = [];
  for (const [source, sourceEntries] of grouped) {
    const sorted = sourceEntries.sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    const latest = sorted[0];

    stats.push({
      source,
      lastSync: latest.completed_at ?? latest.started_at,
      lastStatus: latest.status,
      totalSyncs: sorted.length,
      totalRecords: sorted.reduce((sum, e) => sum + (e.records_synced ?? 0), 0),
      errorCount: sorted.filter((e) => e.status === "error").length,
    });
  }

  return stats.sort((a, b) => a.source.localeCompare(b.source));
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className={cn("h-3.5 w-3.5", STATUS_COLORS.success)} />;
    case "error":
      return <AlertCircle className={cn("h-3.5 w-3.5", STATUS_COLORS.error)} />;
    case "running":
      return <RefreshCw className={cn("h-3.5 w-3.5 animate-spin", STATUS_COLORS.running)} />;
    default:
      return <Clock className={cn("h-3.5 w-3.5", STATUS_COLORS.partial)} />;
  }
}

export function SyncSourceCards({
  entries,
  onTriggerSync,
  syncingSource,
}: SyncSourceCardsProps) {
  const stats = computeSourceStats(entries);

  if (stats.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["plaid", "personize"].map((source) => (
          <KpiCard
            key={source}
            label={source.charAt(0).toUpperCase() + source.slice(1)}
            value="No syncs"
            subtitle="No data yet"
            icon={SOURCE_ICONS[source] ?? <Database className="h-4 w-4" />}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((s) => (
        <div key={s.source} className="relative">
          <KpiCard
            label={s.source.charAt(0).toUpperCase() + s.source.slice(1)}
            value={s.totalRecords.toLocaleString()}
            subtitle={
              s.lastSync
                ? `Last sync ${formatRelativeTime(s.lastSync)}`
                : "Never synced"
            }
            icon={SOURCE_ICONS[s.source] ?? <Database className="h-4 w-4" />}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs">
              <StatusIcon status={s.lastStatus} />
              {s.lastStatus}
            </span>
            <button
              onClick={() => onTriggerSync(s.source)}
              disabled={syncingSource === s.source}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              {syncingSource === s.source ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                "Sync now"
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export type { SyncLogEntry };
