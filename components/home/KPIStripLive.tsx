"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import type { HomeStatsResponse } from "@/app/api/home-stats/route";

const REFRESH_INTERVAL_MS = 60_000;

/** Display "No data" for zero/NaN values, otherwise return the value. */
function safeValue(v: number | string): string | number {
  if (typeof v === "number" && (isNaN(v) || !isFinite(v))) return "No data";
  return v;
}

function safeSubtitle(v: number, suffix: string): string {
  if (isNaN(v) || !isFinite(v) || v === 0) return `no ${suffix}`;
  return `across ${v} ${suffix}${v !== 1 ? "s" : ""}`;
}

interface KPIStripLiveProps {
  initial: HomeStatsResponse;
  communityMemberCount: number;
  communityDelta?: number | null;
}

export function KPIStripLive({
  initial,
  communityMemberCount,
  communityDelta,
}: KPIStripLiveProps) {
  const router = useRouter();
  const [stats, setStats] = useState<HomeStatsResponse>(initial);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/home-stats");
      if (res.ok) {
        const json = (await res.json()) as { data: HomeStatsResponse };
        setStats(json.data);
      }
    } catch {
      // Silently fail — keep showing last known data
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchStats, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStats]);

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
        {isRefreshing && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard
          label="Active Tasks"
          value={safeValue(stats.activeTasks)}
          subtitle={safeSubtitle(stats.activeProjectCount, "project")}
          icon={<CheckSquare className="size-5" />}
          onClick={() => router.push("/tasks")}
        />
        <KpiCard
          label="Overdue Tasks"
          value={safeValue(stats.overdueTasks)}
          subtitle={stats.overdueTasks > 0 ? "need attention" : "all on track"}
          icon={<AlertTriangle className="size-5" />}
          onClick={() => router.push("/tasks")}
        />
        <KpiCard
          label="Completed Today"
          value={safeValue(stats.tasksCompletedToday)}
          subtitle="tasks done"
          icon={<CheckCircle2 className="size-5" />}
          onClick={() => router.push("/tasks")}
        />
        <KpiCard
          label="Content Engine"
          value={safeValue(stats.totalContentPosts)}
          subtitle={contentBreakdown}
          icon={<FileText className="size-5" />}
          onClick={() => router.push("/content")}
        />
        <KpiCard
          label="Content This Week"
          value={safeValue(stats.contentThisWeek)}
          subtitle="posts scheduled"
          icon={<Calendar className="size-5" />}
          onClick={() => router.push("/content")}
        />
        <KpiCard
          label="Contacts"
          value={safeValue(stats.contactsCount)}
          subtitle={stats.contactsCount > 0 ? "total tracked" : "none tracked yet"}
          icon={<Users className="size-5" />}
          onClick={() => router.push("/contacts")}
        />
        <KpiCard
          label="New Contacts"
          value={safeValue(stats.newContactsThisWeek)}
          subtitle="this week"
          icon={<UserPlus className="size-5" />}
          onClick={() => router.push("/contacts")}
        />
        <KpiCard
          label="Pipeline Items"
          value={safeValue(stats.pipelineItemCount)}
          subtitle={
            stats.pipelineItemCount > 0
              ? `$${stats.pipelineTotalValue.toLocaleString()} total value`
              : "no deals yet"
          }
          icon={<Layers className="size-5" />}
          onClick={() => router.push("/pipeline")}
        />
        <KpiCard
          label="Sponsors"
          value={safeValue(stats.sponsorsTotal)}
          subtitle={
            stats.sponsorsConfirmed > 0
              ? `${stats.sponsorsConfirmed} confirmed \u00b7 $${stats.sponsorsConfirmedRevenue.toLocaleString()}`
              : "none confirmed yet"
          }
          icon={<Handshake className="size-5" />}
        />
        <KpiCard
          label="Community"
          value={safeValue(communityMemberCount)}
          subtitle="Telegram members"
          icon={<MessageCircle className="size-5" />}
          delta={communityDelta != null && communityDelta !== 0 ? Math.abs(communityDelta) : undefined}
          deltaDirection={communityDelta != null && communityDelta !== 0 ? (communityDelta > 0 ? "up" : "down") : undefined}
          onClick={() => router.push("/community")}
        />
        <KpiCard
          label="Open Invoices"
          value={formattedInvoices}
          subtitle="outstanding"
          icon={<Receipt className="size-5" />}
          onClick={() => router.push("/finance")}
        />
        <KpiCard
          label="Memory Health"
          value={safeValue(stats.memoryRecords)}
          subtitle={stats.memoryRecords > 0 ? "records synced" : "no records yet"}
          icon={<Brain className="size-5" />}
        />
      </div>
    </section>
  );
}
