"use client";

import { useRouter } from "next/navigation";
import {
  Calendar,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface UpcomingMeeting {
  id: string;
  title: string;
  meeting_date: string | null;
}

interface OverdueTask {
  id: string;
  title: string;
  due_date: string;
  priority: string;
}

interface ScheduledContent {
  id: string;
  title: string | null;
  scheduled_for: string | null;
  platform: string | null;
}

interface UpcomingItemsPanelProps {
  meetings: UpcomingMeeting[];
  overdueTasks: OverdueTask[];
  scheduledContent: ScheduledContent[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "No date";
  const d = new Date(dateStr);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (d.toDateString() === now.toDateString()) return `Today ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`;

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }) + ` ${time}`;
}

const priorityColors: Record<string, string> = {
  critical: "text-[#EF4444]",
  high: "text-[#F97316]",
  medium: "text-[#EAB308]",
  low: "text-muted-foreground",
};

/** Skeleton card matching the shape of a single upcoming-items column */
function UpcomingColumnSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header: icon + title */}
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="size-4 rounded" />
        <Skeleton className="h-4 w-28" />
      </div>
      {/* 3 list item rows */}
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2">
            <Skeleton className="mt-0.5 size-3 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Loading skeleton matching the 3-column UpcomingItemsPanel layout */
export function UpcomingItemsSkeleton() {
  return (
    <section className="space-y-3">
      <Skeleton className="h-5 w-28" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UpcomingColumnSkeleton />
        <UpcomingColumnSkeleton />
        <UpcomingColumnSkeleton />
      </div>
    </section>
  );
}

export function UpcomingItemsPanel({
  meetings,
  overdueTasks,
  scheduledContent,
}: UpcomingItemsPanelProps) {
  const router = useRouter();
  const hasItems = meetings.length > 0 || overdueTasks.length > 0 || scheduledContent.length > 0;

  if (!hasItems) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
        <EmptyState
          title="Nothing upcoming"
          description="Meetings, overdue tasks, and scheduled content will appear here."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Upcoming Meetings */}
        {meetings.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="size-4 text-[#3B82F6]" />
              <h3 className="text-sm font-semibold text-foreground">Next Meetings</h3>
            </div>
            <ul className="space-y-2">
              {meetings.map((m) => (
                <li key={m.id} className="flex items-start gap-2">
                  <Clock className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(m.meeting_date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-[#EF4444]" />
                <h3 className="text-sm font-semibold text-foreground">Overdue Tasks</h3>
              </div>
              <button
                onClick={() => router.push("/tasks")}
                className="flex min-h-[44px] items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
              >
                View all
                <ArrowRight className="size-3" />
              </button>
            </div>
            <ul className="space-y-2">
              {overdueTasks.map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <span className={cn("mt-1 size-2 shrink-0 rounded-full", {
                    "bg-[#EF4444]": t.priority === "critical",
                    "bg-[#F97316]": t.priority === "high",
                    "bg-[#EAB308]": t.priority === "medium",
                    "bg-[#6B7280]": t.priority === "low",
                  })} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{t.title}</p>
                    <p className={cn("text-xs", priorityColors[t.priority] ?? "text-muted-foreground")}>
                      Due {formatDate(t.due_date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Scheduled Content */}
        {scheduledContent.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-[#A855F7]" />
                <h3 className="text-sm font-semibold text-foreground">Scheduled Content</h3>
              </div>
              <button
                onClick={() => router.push("/content")}
                className="flex min-h-[44px] items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground sm:min-h-0"
              >
                View all
                <ArrowRight className="size-3" />
              </button>
            </div>
            <ul className="space-y-2">
              {scheduledContent.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <FileText className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {c.title ?? "Untitled post"}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.scheduled_for)}
                      </span>
                      {c.platform && (
                        <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {c.platform}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
