import {
  CheckSquare,
  Calendar,
  Users,
  Receipt,
  Brain,
} from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";

interface KPIStripProps {
  activeTasks: number;
  activeProjectCount: number;
  contentThisWeek: number;
  contactsCount: number;
  openInvoiceTotal: number;
  memoryRecords: number;
}

export function KPIStrip({
  activeTasks,
  activeProjectCount,
  contentThisWeek,
  contactsCount,
  openInvoiceTotal,
  memoryRecords,
}: KPIStripProps) {
  const formattedInvoices =
    openInvoiceTotal > 0
      ? `$${openInvoiceTotal.toLocaleString()}`
      : "$0";

  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        label="Active Tasks"
        value={activeTasks}
        subtitle={`across ${activeProjectCount} project${activeProjectCount !== 1 ? "s" : ""}`}
        icon={<CheckSquare className="size-5" />}
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
