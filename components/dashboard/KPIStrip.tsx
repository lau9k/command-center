import {
  CheckSquare,
  Calendar,
  Users,
  Receipt,
  Brain,
  FileText,
  Layers,
} from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";

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
}: KPIStripProps) {
  const formattedInvoices =
    openInvoiceTotal > 0
      ? `$${openInvoiceTotal.toLocaleString()}`
      : "$0";

  const contentBreakdown = [
    contentScheduledCount > 0 && `${contentScheduledCount} scheduled`,
    contentDraftCount > 0 && `${contentDraftCount} draft`,
    contentPublishedCount > 0 && `${contentPublishedCount} published`,
  ].filter(Boolean).join(" · ") || "no posts yet";

  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <KpiCard
        label="Active Tasks"
        value={activeTasks}
        subtitle={`across ${activeProjectCount} project${activeProjectCount !== 1 ? "s" : ""}`}
        icon={<CheckSquare className="size-5" />}
      />
      <KpiCard
        label="Content Engine"
        value={totalContentPosts}
        subtitle={contentBreakdown}
        icon={<FileText className="size-5" />}
      />
      <KpiCard
        label="Content This Week"
        value={contentThisWeek}
        subtitle="posts scheduled"
        icon={<Calendar className="size-5" />}
      />
      <KpiCard
        label="Contacts"
        value={contactsCount}
        subtitle="total tracked"
        icon={<Users className="size-5" />}
      />
      <KpiCard
        label="Pipeline Items"
        value={pipelineItemCount}
        subtitle="deals tracked"
        icon={<Layers className="size-5" />}
      />
      <KpiCard
        label="Open Invoices"
        value={formattedInvoices}
        subtitle="outstanding"
        icon={<Receipt className="size-5" />}
      />
      <KpiCard
        label="Memory Health"
        value={memoryRecords}
        subtitle="records synced"
        icon={<Brain className="size-5" />}
      />
    </section>
  );
}
