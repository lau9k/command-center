"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  RefreshCw,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DailyBriefing } from "@/app/api/ai/daily-briefing/route";

/* ------------------------------------------------------------------ */
/*  Derive the 4 briefing sections from the raw API data              */
/* ------------------------------------------------------------------ */

interface BriefingSections {
  overdue: { label: string; items: string[] };
  momentum: { label: string; items: string[] };
  anomalies: { label: string; items: string[] };
  suggestedAction: string;
}

function deriveSections(data: DailyBriefing): BriefingSections {
  // Overdue — tasks + invoices
  const overdueItems: string[] = [];
  for (const t of data.overdueTasks) {
    overdueItems.push(`Task "${t.title}" is overdue (${t.priority} priority)`);
  }
  for (const inv of data.overdueInvoices) {
    overdueItems.push(
      `Invoice "${inv.title}" — $${inv.amount.toLocaleString()} unpaid`,
    );
  }

  // Momentum — meetings happening, new contacts, upcoming tasks
  const momentumItems: string[] = [];
  if (data.meetings.length > 0) {
    momentumItems.push(
      `${data.meetings.length} meeting${data.meetings.length > 1 ? "s" : ""} scheduled today`,
    );
  }
  if (data.newContacts.length > 0) {
    momentumItems.push(
      `${data.newContacts.length} new contact${data.newContacts.length > 1 ? "s" : ""} added`,
    );
  }
  if (data.tasksDueSoon.length > 0) {
    momentumItems.push(
      `${data.tasksDueSoon.length} task${data.tasksDueSoon.length > 1 ? "s" : ""} due within 48h`,
    );
  }

  // Anomalies — overdue invoices total as revenue concern
  const anomalyItems: string[] = [];
  if (data.overdueInvoices.length > 0) {
    const total = data.overdueInvoices.reduce((s, i) => s + i.amount, 0);
    anomalyItems.push(
      `$${total.toLocaleString()} in overdue invoices — potential revenue gap`,
    );
  }
  if (data.overdueTasks.length >= 3) {
    anomalyItems.push(
      `${data.overdueTasks.length} overdue tasks — workload may be unbalanced`,
    );
  }

  // Suggested action — rule-based
  let suggestedAction = "You're on track. Review upcoming tasks and plan ahead.";
  if (data.overdueTasks.length > 0) {
    const critical = data.overdueTasks.find((t) => t.priority === "critical");
    if (critical) {
      suggestedAction = `Resolve critical task "${critical.title}" before anything else today.`;
    } else {
      suggestedAction = `Clear ${data.overdueTasks.length} overdue task${data.overdueTasks.length > 1 ? "s" : ""} to get back on track.`;
    }
  } else if (data.overdueInvoices.length > 0) {
    suggestedAction = `Follow up on ${data.overdueInvoices.length} overdue invoice${data.overdueInvoices.length > 1 ? "s" : ""} to close the revenue gap.`;
  } else if (data.meetings.length > 0 && data.tasksDueSoon.length > 0) {
    suggestedAction =
      "Prepare for today's meetings, then tackle upcoming tasks.";
  }

  return {
    overdue: { label: "Overdue", items: overdueItems },
    momentum: { label: "Momentum", items: momentumItems },
    anomalies: { label: "Anomalies", items: anomalyItems },
    suggestedAction,
  };
}

/* ------------------------------------------------------------------ */
/*  Section component                                                  */
/* ------------------------------------------------------------------ */

const SECTION_STYLES = {
  red: {
    dot: "bg-red-500 dark:bg-red-400",
    heading: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900/50",
  },
  green: {
    dot: "bg-green-500 dark:bg-green-400",
    heading: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-900/50",
  },
  yellow: {
    dot: "bg-yellow-500 dark:bg-yellow-400",
    heading: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-900/50",
  },
  blue: {
    dot: "bg-blue-500 dark:bg-blue-400",
    heading: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900/50",
  },
} as const;

function BriefingSection({
  icon,
  label,
  items,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
  color: keyof typeof SECTION_STYLES;
}) {
  if (items.length === 0) return null;
  const s = SECTION_STYLES[color];

  return (
    <div className={`rounded-lg border p-3 ${s.bg} ${s.border}`}>
      <div className={`mb-2 flex items-center gap-1.5 text-xs font-semibold ${s.heading}`}>
        {icon}
        {label}
        <span className="ml-1 rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] font-medium dark:bg-white/10">
          {items.length}
        </span>
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-foreground">
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${s.dot}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function BriefingSkeleton() {
  return (
    <div className="space-y-3 px-4 pb-4 pt-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DailyBriefingPanel() {
  const [expanded, setExpanded] = useState(false);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBriefing = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/ai/daily-briefing");
      if (res.ok) {
        const json = (await res.json()) as { data: DailyBriefing };
        setBriefing(json.data);
      }
    } catch {
      // Non-critical — silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  const sections = briefing ? deriveSections(briefing) : null;
  const hasOverdueItems =
    briefing &&
    (briefing.overdueTasks.length > 0 || briefing.overdueInvoices.length > 0);

  return (
    <section className="rounded-lg border border-border bg-card">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 p-4 text-left"
      >
        {expanded ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
        <Zap
          className={`size-4 ${hasOverdueItems ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"}`}
        />
        <h2 className="text-sm font-semibold text-foreground">
          Daily Briefing
        </h2>

        {/* Summary badge */}
        <span className="ml-auto text-xs text-muted-foreground">
          {loading
            ? "Loading…"
            : briefing?.summary ?? "No data"}
        </span>
      </button>

      {/* Collapsible body */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          {loading ? (
            <BriefingSkeleton />
          ) : sections ? (
            <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
              {/* Overdue (red) */}
              <BriefingSection
                icon={<AlertTriangle className="size-3" />}
                label={sections.overdue.label}
                items={sections.overdue.items}
                color="red"
              />

              {/* Momentum (green) */}
              <BriefingSection
                icon={<TrendingUp className="size-3" />}
                label={sections.momentum.label}
                items={sections.momentum.items}
                color="green"
              />

              {/* Anomalies (yellow) */}
              <BriefingSection
                icon={<AlertTriangle className="size-3" />}
                label={sections.anomalies.label}
                items={sections.anomalies.items}
                color="yellow"
              />

              {/* Suggested Action (blue) */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-950/30">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <Lightbulb className="size-3" />
                  Suggested Action
                </div>
                <p className="text-sm text-foreground">
                  {sections.suggestedAction}
                </p>
              </div>

              {/* Footer — last updated + refresh */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  Last updated{" "}
                  {briefing ? formatTimestamp(briefing.generatedAt) : "—"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchBriefing(true);
                  }}
                  disabled={refreshing}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw
                    className={`size-3 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
