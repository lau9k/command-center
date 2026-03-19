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
} from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";

const ACCENT = {
  blue: "#3B82F6",
  green: "#22C55E",
  purple: "#8B5CF6",
  cyan: "#06B6D4",
  amber: "#F59E0B",
  indigo: "#6366F1",
  pink: "#EC4899",
} as const;

interface KPIStripProps {
  activeTasks: number;
  activeProjectCount: number;
  contentThisWeek: number;
  contactsCount: number;
  openInvoiceTotal: number;
  memoryRecords: number;
  totalContentPosts: number;
  contentDraftCount: number;
  contentScheduledCount: number;
  contentPublishedCount: number;
  pipelineItemCount: number;
  pipelineTotalValue: number;
  communityMemberCount: number;
  communityDelta?: number | null;
  sponsorsTotal: number;
  sponsorsConfirmed: number;
  sponsorsConfirmedRevenue: number;
}

/** Display "No data" for zero/NaN values, otherwise return the value. */
function safeValue(v: number | string): string | number {
  if (typeof v === "number" && (isNaN(v) || !isFinite(v))) return "No data";
  return v;
}

function safeSubtitle(v: number, suffix: string): string {
  if (isNaN(v) || !isFinite(v) || v === 0) return `no ${suffix}`;
  return `across ${v} ${suffix}${v !== 1 ? "s" : ""}`;
}

export function KPIStrip({
  activeTasks,
  activeProjectCount,
  contentThisWeek,
  contactsCount,
  openInvoiceTotal,
  memoryRecords,
  totalContentPosts,
  contentDraftCount,
  contentScheduledCount,
  contentPublishedCount,
  pipelineItemCount,
  pipelineTotalValue,
  communityMemberCount,
  communityDelta,
  sponsorsTotal,
  sponsorsConfirmed,
  sponsorsConfirmedRevenue,
}: KPIStripProps) {
  const formattedInvoices =
    isNaN(openInvoiceTotal) || !isFinite(openInvoiceTotal)
      ? "No data"
      : openInvoiceTotal > 0
        ? `$${openInvoiceTotal.toLocaleString()}`
        : "$0";

  const contentBreakdown = [
    contentScheduledCount > 0 && `${contentScheduledCount} scheduled`,
    contentDraftCount > 0 && `${contentDraftCount} draft`,
    contentPublishedCount > 0 && `${contentPublishedCount} published`,
  ].filter(Boolean).join(" · ") || "no posts yet";

  return (
    <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        label="Active Tasks"
        value={safeValue(activeTasks)}
        subtitle={safeSubtitle(activeProjectCount, "project")}
        icon={<CheckSquare className="size-5" />}
        accentColor={ACCENT.blue}
      />
      <KpiCard
        label="Content Engine"
        value={safeValue(totalContentPosts)}
        subtitle={contentBreakdown}
        icon={<FileText className="size-5" />}
        accentColor={ACCENT.purple}
      />
      <KpiCard
        label="Content This Week"
        value={safeValue(contentThisWeek)}
        subtitle="posts scheduled"
        icon={<Calendar className="size-5" />}
        accentColor={ACCENT.cyan}
      />
      <KpiCard
        label="Contacts"
        value={safeValue(contactsCount)}
        subtitle={contactsCount > 0 ? "total tracked" : "none tracked yet"}
        icon={<Users className="size-5" />}
        accentColor={ACCENT.indigo}
      />
      <KpiCard
        label="Pipeline Items"
        value={safeValue(pipelineItemCount)}
        subtitle={
          pipelineItemCount > 0
            ? `$${pipelineTotalValue.toLocaleString()} total value`
            : "no deals yet"
        }
        icon={<Layers className="size-5" />}
        accentColor={ACCENT.amber}
      />
      <KpiCard
        label="Sponsors"
        value={safeValue(sponsorsTotal)}
        subtitle={
          sponsorsConfirmed > 0
            ? `${sponsorsConfirmed} confirmed · $${sponsorsConfirmedRevenue.toLocaleString()}`
            : "none confirmed yet"
        }
        icon={<Handshake className="size-5" />}
      />
      <KpiCard
        label="Community"
        value={safeValue(communityMemberCount)}
        subtitle="Telegram members"
        icon={<MessageCircle className="size-5" />}
        accentColor={ACCENT.cyan}
        delta={communityDelta != null && communityDelta !== 0 ? Math.abs(communityDelta) : undefined}
        deltaDirection={communityDelta != null && communityDelta !== 0 ? (communityDelta > 0 ? "up" : "down") : undefined}
      />
      <KpiCard
        label="Open Invoices"
        value={formattedInvoices}
        subtitle="outstanding"
        icon={<Receipt className="size-5" />}
      />
      <KpiCard
        label="Memory Health"
        value={safeValue(memoryRecords)}
        subtitle={memoryRecords > 0 ? "records synced" : "no records yet"}
        icon={<Brain className="size-5" />}
      />
    </section>
  );
}
