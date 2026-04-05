"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Calendar,
  Users,
  Receipt,
  Brain,
  FileText,
  Layers,
  MessageCircle,
  Handshake,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Loader2,
  RefreshCw,
  MessagesSquare,
  Database,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { KpiCard } from "@/components/ui/kpi-card";
import { KpiStripSkeleton } from "@/components/home/kpi-card-skeleton";
import { KpiErrorState } from "@/components/home/kpi-error-state";
import type { HomeStatsResponse } from "@/app/api/home-stats/route";

/** Extended stats shape — optional pipeline counts added by BAS-286 */
type StatsWithPipeline = HomeStatsResponse & {
  supabaseContactsCount?: number;
  supabaseConversationsCount?: number;
};

const REFRESH_INTERVAL_MS = 300_000;

/** Accent colors for KPI categories */
const ACCENT = {
  blue: "#3B82F6",
  red: "#EF4444",
  green: "#22C55E",
  purple: "#8B5CF6",
  cyan: "#06B6D4",
  amber: "#F59E0B",
  indigo: "#6366F1",
  pink: "#EC4899",
} as const;

/** Generate deterministic sparkline data (7 points) from a current value. */
function makeSparkline(current: number, seed: number): { v: number }[] {
  const points: { v: number }[] = [];
  const base = Math.max(current, 1);
  // Simple seeded pseudo-random using seed to create variance
  let s = seed;
  for (let i = 0; i < 7; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const variance = 0.6 + (s % 100) / 125; // 0.6–1.4 range
    const val = Math.max(0, Math.round(base * variance));
    points.push({ v: val });
  }
  // Last point is always the actual current value
  points[6] = { v: current };
  return points;
}

function MiniSparkline({
  data,
  color,
}: {
  data: { v: number }[];
  color: string;
}) {
  const gradientId = `spark-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width={80} height={32}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Display "No data" for zero/NaN values, otherwise return the value. */
function safeValue(v: number | string): string | number {
  if (typeof v === "number" && (isNaN(v) || !isFinite(v))) return "No data";
  return v;
}

/**
 * When the dashboard is degraded (fetch failed) and a metric is 0,
 * show "—" instead of "0" to avoid misleading the user.
 */
function errorAwareValue(
  v: number,
  degraded: boolean,
): { display: string | number; failed: boolean } {
  if (typeof v === "number" && (isNaN(v) || !isFinite(v)))
    return { display: "No data", failed: false };
  if (v === 0 && degraded) return { display: "—", failed: true };
  return { display: v, failed: false };
}

function SourceBadge({ source }: { source: "personize" | "supabase" }) {
  const label = source === "supabase" ? "Supabase" : "Personize";
  return (
    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      <Database className="size-2.5" />
      {label}
    </span>
  );
}

function safeSubtitle(v: number, suffix: string): string {
  if (isNaN(v) || !isFinite(v) || v === 0) return `no ${suffix}`;
  return `across ${v} ${suffix}${v !== 1 ? "s" : ""}`;
}

function formatTimeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

interface KPIStripLiveProps {
  initial: StatsWithPipeline;
  communityMemberCount: number;
  communityDelta?: number | null;
}

export function KPIStripLive({
  initial,
  communityMemberCount,
  communityDelta,
}: KPIStripLiveProps) {
  const router = useRouter();
  const [stats, setStats] = useState<StatsWithPipeline | null>(initial);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isDegraded = hasError || (stats?._meta?.degraded ?? false);
  const [lastUpdated, setLastUpdated] = useState<string>(initial.lastUpdated);
  const [, setTick] = useState(0);

  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/home-stats");
      if (res.ok) {
        const json = (await res.json()) as { data: StatsWithPipeline };
        setStats(json.data);
        setLastUpdated(json.data.lastUpdated);
        setHasError(false);
      } else {
        setHasError(true);
      }
    } catch {
      setHasError(true);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchStats, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Update the "X ago" display every 15 seconds
  useEffect(() => {
    const tick = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(tick);
  }, []);

  // Memoize sparkline data to avoid regenerating on every render
  const sparklines = useMemo(() => {
    if (!stats) return null;
    return {
      active: makeSparkline(stats.activeTasks, 1),
      overdue: makeSparkline(stats.overdueTasks, 2),
      completed: makeSparkline(stats.tasksCompletedToday, 3),
      content: makeSparkline(stats.totalContentPosts, 4),
      contentWeek: makeSparkline(stats.contentThisWeek, 5),
      contacts: makeSparkline(stats.contactsCount, 6),
      newContacts: makeSparkline(stats.newContactsThisWeek, 7),
      conversations: makeSparkline(stats.conversationsCount, 8),
      pipeline: makeSparkline(stats.pipelineItemCount, 9),
      sponsors: makeSparkline(stats.sponsorsTotal, 10),
      community: makeSparkline(communityMemberCount, 11),
      invoices: makeSparkline(stats.openInvoiceTotal, 12),
      memory: makeSparkline(stats.memoryRecords, 13),
    };
  }, [stats, communityMemberCount]);

  if (!stats) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Key Metrics</h2>
        <KpiStripSkeleton />
      </section>
    );
  }

  if (hasError && !stats) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Key Metrics</h2>
        <KpiErrorState onRetry={fetchStats} />
      </section>
    );
  }

  const formattedInvoices =
    isNaN(stats.openInvoiceTotal) || !isFinite(stats.openInvoiceTotal)
      ? "No data"
      : stats.openInvoiceTotal > 0
        ? `$${stats.openInvoiceTotal.toLocaleString()}`
        : "$0";

  const contentBreakdown = [
    stats.contentScheduledCount > 0 && `${stats.contentScheduledCount} scheduled`,
    stats.contentDraftCount > 0 && `${stats.contentDraftCount} draft`,
    stats.contentPublishedCount > 0 && `${stats.contentPublishedCount} published`,
  ].filter(Boolean).join(" \u00b7 ") || "no posts yet";

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Key Metrics</h2>
        {isRefreshing ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <button
            type="button"
            onClick={fetchStats}
            className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:size-auto sm:p-1"
            aria-label="Refresh metrics"
          >
            <RefreshCw className="size-4" />
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          Updated {formatTimeAgo(lastUpdated)}
        </span>
        {hasError && (
          <span className="text-xs text-destructive">
            Refresh failed — showing last known data
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(() => {
          const active = errorAwareValue(stats.activeTasks, isDegraded);
          return (
            <KpiCard
              label="Active Tasks"
              value={active.display}
              subtitle={active.failed ? "Failed to load" : safeSubtitle(stats.activeProjectCount, "project")}
              icon={<CheckSquare className="size-5" />}
              accentColor={ACCENT.blue}
              sparkline={sparklines && <MiniSparkline data={sparklines.active} color={ACCENT.blue} />}
              onClick={() => router.push("/tasks")}
              title={active.failed ? "Failed to load — showing placeholder" : undefined}
            />
          );
        })()}
        {(() => {
          const overdue = errorAwareValue(stats.overdueTasks, isDegraded);
          return (
            <KpiCard
              label="Overdue Tasks"
              value={overdue.display}
              subtitle={overdue.failed ? "Failed to load" : stats.overdueTasks > 0 ? "need attention" : "all on track"}
              icon={<AlertTriangle className="size-5" />}
              accentColor={ACCENT.red}
              sparkline={sparklines && <MiniSparkline data={sparklines.overdue} color={ACCENT.red} />}
              onClick={() => router.push("/tasks")}
              title={overdue.failed ? "Failed to load — showing placeholder" : undefined}
            />
          );
        })()}
        {(() => {
          const completed = errorAwareValue(stats.tasksCompletedToday, isDegraded);
          return (
            <KpiCard
              label="Completed Today"
              value={completed.display}
              subtitle={completed.failed ? "Failed to load" : "tasks done"}
              icon={<CheckCircle2 className="size-5" />}
              accentColor={ACCENT.green}
              sparkline={sparklines && <MiniSparkline data={sparklines.completed} color={ACCENT.green} />}
              onClick={() => router.push("/tasks")}
              title={completed.failed ? "Failed to load — showing placeholder" : undefined}
            />
          );
        })()}
        {(() => {
          const content = errorAwareValue(stats.totalContentPosts, isDegraded);
          return (
            <KpiCard
              label="Content Engine"
              value={content.display}
              subtitle={content.failed ? "Failed to load" : contentBreakdown}
              icon={<FileText className="size-5" />}
              accentColor={ACCENT.purple}
              sparkline={sparklines && <MiniSparkline data={sparklines.content} color={ACCENT.purple} />}
              onClick={() => router.push("/content")}
              title={content.failed ? "Failed to load — showing placeholder" : undefined}
            />
          );
        })()}
        {(() => {
          const contentWeek = errorAwareValue(stats.contentThisWeek, isDegraded);
          return (
            <KpiCard
              label="Content This Week"
              value={contentWeek.display}
              subtitle={contentWeek.failed ? "Failed to load" : "posts scheduled"}
              icon={<Calendar className="size-5" />}
              accentColor={ACCENT.cyan}
              sparkline={sparklines && <MiniSparkline data={sparklines.contentWeek} color={ACCENT.cyan} />}
              onClick={() => router.push("/content")}
              title={contentWeek.failed ? "Failed to load — showing placeholder" : undefined}
            />
          );
        })()}
        {(() => {
          const contacts = errorAwareValue(stats.contactsCount, isDegraded);
          return (
            <KpiCard
              label="Contacts"
              value={contacts.display}
              subtitle={
                contacts.failed
                  ? "Failed to load"
                  : stats.contactsCount > 0
                    ? "total tracked"
                    : "none tracked yet"
              }
              secondarySubtitle={
                contacts.failed
                  ? undefined
                  : stats.enrichment_pct > 0
                    ? `${stats.enrichment_pct}% enriched`
                    : stats.supabaseContactsCount != null && stats.supabaseContactsCount > 0
                      ? `${stats.supabaseContactsCount} in pipeline`
                      : undefined
              }
              icon={
                <div className="flex items-center gap-1.5">
                  <SourceBadge source={stats.contacts_source} />
                  <Users className="size-5" />
                </div>
              }
              accentColor={ACCENT.indigo}
              sparkline={sparklines && <MiniSparkline data={sparklines.contacts} color={ACCENT.indigo} />}
              onClick={() => router.push("/contacts")}
              title={contacts.failed ? "Failed to load — showing placeholder" : undefined}
            />
          );
        })()}
        {(() => {
          const newContacts = errorAwareValue(stats.newContactsThisWeek, isDegraded);
          return (
            <KpiCard
              label="New Contacts"
              value={newContacts.display}
              subtitle={newContacts.failed ? "Failed to load" : "this week"}
              icon={<UserPlus className="size-5" />}
              sparkline={sparklines && <MiniSparkline data={sparklines.newContacts} color={ACCENT.indigo} />}
              onClick={() => router.push("/contacts")}
              title={newContacts.failed ? "Failed to load — showing placeholder" : undefined}
            />
          );
        })()}
        {(() => {
          const conversations = errorAwareValue(stats.conversationsCount, isDegraded);
          return (
            <KpiCard
              label="Conversations"
              value={conversations.display}
              subtitle={
                conversations.failed
                  ? "Failed to load"
                  : stats.conversationsCount > 0
                    ? "total tracked"
                    : "none yet"
              }
              secondarySubtitle={
                conversations.failed
                  ? undefined
                  : stats.supabaseConversationsCount != null &&
                      stats.supabaseConversationsCount > 0 &&
                      stats.supabaseConversationsCount !== stats.conversationsCount
                    ? `${stats.supabaseConversationsCount} in pipeline`
                    : undefined
              }
              icon={<MessagesSquare className="size-5" />}
              sparkline={sparklines && <MiniSparkline data={sparklines.conversations} color={ACCENT.blue} />}
              title={conversations.failed ? "Failed to load — showing placeholder" : undefined}
            />
          );
        })()}
        {(() => {
          const pipeline = errorAwareValue(stats.pipelineItemCount, isDegraded);
          return (
            <KpiCard
              label="Pipeline Items"
              value={pipeline.display}
              subtitle={
                pipeline.failed
                  ? "Failed to load"
                  : stats.pipelineItemCount > 0
                    ? `$${stats.pipelineTotalValue.toLocaleString()} total value`
                    : "no deals yet"
              }
              icon={<Layers className="size-5" />}
              accentColor={ACCENT.amber}
              sparkline={sparklines && <MiniSparkline data={sparklines.pipeline} color={ACCENT.amber} />}
              onClick={() => router.push("/pipeline")}
              title={pipeline.failed ? "Failed to load — showing placeholder" : undefined}
            />
          );
        })()}
        {(() => {
          const sponsors = errorAwareValue(stats.sponsorsTotal, isDegraded);
          return (
            <KpiCard
              label="Sponsors"
              value={sponsors.display}
              subtitle={
                sponsors.failed
                  ? "Failed to load"
                  : stats.sponsorsConfirmed > 0
                    ? `${stats.sponsorsConfirmed} confirmed \u00b7 $${stats.sponsorsConfirmedRevenue.toLocaleString()}`
                    : "none confirmed yet"
              }
              icon={<Handshake className="size-5" />}
              sparkline={sparklines && <MiniSparkline data={sparklines.sponsors} color={ACCENT.pink} />}
              title={sponsors.failed ? "Failed to load — showing placeholder" : undefined}
            />
          );
        })()}
        <KpiCard
          label="Community"
          value={safeValue(communityMemberCount)}
          subtitle="Telegram members"
          icon={<MessageCircle className="size-5" />}
          accentColor={ACCENT.cyan}
          delta={communityDelta != null && communityDelta !== 0 ? Math.abs(communityDelta) : undefined}
          deltaDirection={communityDelta != null && communityDelta !== 0 ? (communityDelta > 0 ? "up" : "down") : undefined}
          sparkline={sparklines && <MiniSparkline data={sparklines.community} color={ACCENT.cyan} />}
          onClick={() => router.push("/community")}
        />
        <KpiCard
          label="Open Invoices"
          value={formattedInvoices}
          subtitle="outstanding"
          icon={<Receipt className="size-5" />}
          sparkline={sparklines && <MiniSparkline data={sparklines.invoices} color={ACCENT.amber} />}
          onClick={() => router.push("/finance")}
        />
        {(() => {
          const memory = errorAwareValue(stats.memoryRecords, isDegraded);
          return (
            <KpiCard
              label="Memory Health"
              value={memory.display}
              subtitle={memory.failed ? "Failed to load" : stats.memoryRecords > 0 ? "records synced" : "no records yet"}
              icon={<Brain className="size-5" />}
              sparkline={sparklines && <MiniSparkline data={sparklines.memory} color={ACCENT.green} />}
              title={memory.failed ? "Failed to load — showing placeholder" : undefined}
            />
          );
        })()}
      </div>
    </section>
  );
}
