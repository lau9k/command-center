"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Sun,
  Calendar,
  Clock,
  AlertTriangle,
  UserPlus,
  Receipt,
  Loader2,
} from "lucide-react";
import type { DailyBriefing } from "@/app/api/ai/daily-briefing/route";

function formatMeetingTime(date: string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDueDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffHours <= 0) return "overdue";
  if (diffHours <= 24) return `in ${diffHours}h`;
  const diffDays = Math.ceil(diffHours / 24);
  return `in ${diffDays}d`;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500 dark:bg-red-400",
  high: "bg-orange-500 dark:bg-orange-400",
  medium: "bg-yellow-500 dark:bg-yellow-400",
  low: "bg-green-500 dark:bg-green-400",
};

export function DailyBriefingWidget() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/daily-briefing");
      if (res.ok) {
        const json = (await res.json()) as { data: DailyBriefing };
        setBriefing(json.data);
      }
    } catch {
      // Silent fail — briefing is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  return (
    <section className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 p-4 text-left"
      >
        {expanded ? (
          <ChevronDown className="size-4 text-orange-500 dark:text-orange-400" />
        ) : (
          <ChevronRight className="size-4 text-orange-500 dark:text-orange-400" />
        )}
        <Sun className="size-4 text-orange-500 dark:text-orange-400" />
        <h2 className="text-sm font-semibold text-foreground">Daily Briefing</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? (
            <Loader2 className="inline size-3 animate-spin" />
          ) : (
            briefing?.summary ?? "Loading..."
          )}
        </span>
      </button>

      {expanded && briefing && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {/* Meetings */}
          {briefing.meetings.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Calendar className="size-3" />
                Meetings Today
              </div>
              <div className="space-y-1">
                {briefing.meetings.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer"
                    onClick={() => router.push(`/meetings?id=${m.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/meetings?id=${m.id}`);
                    }}
                  >
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatMeetingTime(m.meetingDate)}
                    </span>
                    <span className="truncate text-foreground">{m.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks Due Soon */}
          {briefing.tasksDueSoon.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="size-3" />
                Due Within 48h
              </div>
              <div className="space-y-1">
                {briefing.tasksDueSoon.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer"
                    onClick={() => router.push(`/tasks?id=${t.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/tasks?id=${t.id}`);
                    }}
                  >
                    <div
                      className={`size-1.5 shrink-0 rounded-full ${PRIORITY_COLORS[t.priority] ?? "bg-gray-500"}`}
                    />
                    <span className="truncate text-foreground">{t.title}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {formatDueDate(t.dueDate)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Tasks */}
          {briefing.overdueTasks.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400">
                <AlertTriangle className="size-3" />
                Overdue
              </div>
              <div className="space-y-1">
                {briefing.overdueTasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer"
                    onClick={() => router.push(`/tasks?id=${t.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/tasks?id=${t.id}`);
                    }}
                  >
                    <div
                      className={`size-1.5 shrink-0 rounded-full ${PRIORITY_COLORS[t.priority] ?? "bg-gray-500"}`}
                    />
                    <span className="truncate text-foreground">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Contacts */}
          {briefing.newContacts.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <UserPlus className="size-3" />
                New Contacts (24h)
              </div>
              <div className="space-y-1">
                {briefing.newContacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer"
                    onClick={() => router.push(`/contacts?id=${c.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/contacts?id=${c.id}`);
                    }}
                  >
                    <span className="truncate text-foreground">{c.name}</span>
                    {c.company && (
                      <span className="text-xs text-muted-foreground">
                        {c.company}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Invoices */}
          {briefing.overdueInvoices.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400">
                <Receipt className="size-3" />
                Overdue Invoices
              </div>
              <div className="space-y-1">
                {briefing.overdueInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer"
                    onClick={() => router.push("/finance")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push("/finance");
                    }}
                  >
                    <span className="truncate text-foreground">{inv.title}</span>
                    <span className="ml-auto shrink-0 text-xs font-medium text-red-500 dark:text-red-400">
                      ${inv.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {briefing.meetings.length === 0 &&
            briefing.tasksDueSoon.length === 0 &&
            briefing.overdueTasks.length === 0 &&
            briefing.newContacts.length === 0 &&
            briefing.overdueInvoices.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                Nothing urgent today. Focus on deep work.
              </p>
            )}
        </div>
      )}
    </section>
  );
}
