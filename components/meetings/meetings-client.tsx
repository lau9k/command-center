"use client";

import { useState, useCallback } from "react";
import {
  Calendar,
  Users,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SharedEmptyState } from "@/components/shared/EmptyState";
import type { Meeting, MeetingAction, MeetingActionItem, MeetingAttendee } from "@/lib/types/database";

type MeetingWithActions = Meeting & { actions: MeetingAction[] };

const STATUS_CONFIG = {
  pending_review: { label: "Pending Review", color: "text-[#F59E0B]", bg: "bg-[#F59E0B]/20", icon: Clock },
  reviewed: { label: "Reviewed", color: "text-[#22C55E]", bg: "bg-[#22C55E]/20", icon: CheckCircle2 },
  dismissed: { label: "Dismissed", color: "text-muted-foreground", bg: "bg-muted", icon: XCircle },
} as const;

const ACTION_TYPE_LABELS: Record<string, string> = {
  follow_up_email: "Follow-Up Email",
  create_document: "Create Document",
  make_intro: "Make Intros",
  add_contact: "Add Contacts",
  create_task: "Create Tasks",
  custom: "Custom",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateShort(date: Date): string {
  return date.toISOString().split("T")[0];
}

function MeetingRow({ meeting }: { meeting: MeetingWithActions }) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[meeting.status];
  const StatusIcon = config.icon;
  const attendees = (meeting.attendees ?? []) as MeetingAttendee[];
  const actionItems = (meeting.action_items ?? []) as MeetingActionItem[];
  const decisions = (meeting.decisions ?? []) as string[];
  const completedCount = meeting.actions.filter((a) => a.status === "completed").length;

  return (
    <div className="rounded-lg border border-border bg-card transition-all duration-150">
      <button
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {meeting.title}
            </h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
              <StatusIcon className="size-3" />
              {config.label}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              {formatDate(meeting.meeting_date)}
            </span>
            {attendees.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" />
                {attendees.length} attendee{attendees.length !== 1 ? "s" : ""}
              </span>
            )}
            {actionItems.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                {actionItems.length} action item{actionItems.length !== 1 ? "s" : ""}
              </span>
            )}
            {meeting.actions.length > 0 && (
              <span>
                {completedCount}/{meeting.actions.length} actions completed
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {/* Summary */}
          {meeting.summary && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground uppercase">Summary</h4>
              <p className="text-sm text-foreground whitespace-pre-line">{meeting.summary}</p>
            </div>
          )}

          {/* Attendees */}
          {attendees.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground uppercase">Attendees</h4>
              <div className="flex flex-wrap gap-2">
                {attendees.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground"
                  >
                    {a.name}
                    {a.company && <span className="ml-1 text-muted-foreground">({a.company})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Decisions */}
          {decisions.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground uppercase">Decisions</h4>
              <ul className="list-disc pl-4 text-sm text-foreground space-y-1">
                {decisions.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground uppercase">Action Items</h4>
              <ul className="space-y-1">
                {actionItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" />
                    <span>{item.title}</span>
                    {item.assignee && (
                      <span className="text-xs text-muted-foreground">— {item.assignee}</span>
                    )}
                    {item.due_date && (
                      <span className="text-xs text-muted-foreground">Due: {item.due_date}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions Taken */}
          {meeting.actions.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium text-muted-foreground uppercase">Actions Taken</h4>
              <div className="space-y-1">
                {meeting.actions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    {action.status === "completed" ? (
                      <CheckCircle2 className="size-3.5 shrink-0 text-[#22C55E]" />
                    ) : (
                      <Clock className="size-3.5 shrink-0 text-[#F59E0B]" />
                    )}
                    <span className="text-foreground">
                      {ACTION_TYPE_LABELS[action.action_type] ?? action.action_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Loading skeleton ---

function MeetingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="size-4 rounded bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/3 rounded bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Main component ---

interface MeetingsClientProps {
  meetings: MeetingWithActions[];
}

export function MeetingsClient({ meetings: initialMeetings }: MeetingsClientProps) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending_review" | "reviewed" | "dismissed">("all");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; actions_created: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Date range filter — default to last 30 days
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const [dateFrom, setDateFrom] = useState(formatDateShort(defaultFrom));
  const [dateTo, setDateTo] = useState(formatDateShort(new Date()));

  const refreshMeetings = useCallback(async () => {
    try {
      const res = await fetch("/api/meetings?pageSize=200");
      if (res.ok) {
        const json = await res.json();
        setMeetings(json.data ?? []);
      }
    } catch {
      // Silently fail on refresh — data stays stale
    }
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const res = await fetch("/api/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "granola" }),
      });

      const json = await res.json();

      if (!res.ok && !json.synced) {
        setSyncError(json.error ?? "Sync failed");
        return;
      }

      setSyncResult({
        synced: json.synced ?? 0,
        actions_created: json.actions_created ?? 0,
      });

      // Refresh meetings list after sync
      await refreshMeetings();
    } catch {
      setSyncError("Failed to connect to sync service");
    } finally {
      setSyncing(false);
    }
  }, [refreshMeetings]);

  // Apply filters
  const filtered = meetings.filter((m) => {
    // Status filter
    if (statusFilter !== "all" && m.status !== statusFilter) return false;

    // Date range filter
    if (m.meeting_date) {
      const meetingDate = m.meeting_date.split("T")[0];
      if (dateFrom && meetingDate < dateFrom) return false;
      if (dateTo && meetingDate > dateTo) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Sync bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {syncing ? "Syncing..." : "Sync from Granola"}
        </Button>

        {syncResult && (
          <span className="text-xs text-[#22C55E]">
            Synced {syncResult.synced} meeting{syncResult.synced !== 1 ? "s" : ""}, {syncResult.actions_created} action{syncResult.actions_created !== 1 ? "s" : ""} created
          </span>
        )}
        {syncError && (
          <span className="text-xs text-destructive">{syncError}</span>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          {(["all", "pending_review", "reviewed", "dismissed"] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? "All" : STATUS_CONFIG[status].label}
            </Button>
          ))}
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-muted-foreground">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground"
          />
          <label className="text-xs text-muted-foreground">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground"
          />
        </div>
      </div>

      {/* Meeting list */}
      {syncing ? (
        <MeetingSkeleton />
      ) : filtered.length === 0 && meetings.length === 0 ? (
        <SharedEmptyState
          icon={<Calendar className="size-12" />}
          title="No meetings yet"
          description="Meetings will appear here when synced from Granola. Click the button above to pull your recent meetings."
          action={{ label: "Sync from Granola", onClick: handleSync }}
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Calendar className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            No meetings match the current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((meeting) => (
            <MeetingRow key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  );
}
