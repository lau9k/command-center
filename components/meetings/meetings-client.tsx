"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SharedEmptyState } from "@/components/shared/EmptyState";
import { ActionItemRow } from "@/components/meetings/ActionItemRow";
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

function MeetingRow({
  meeting,
  selected,
  onToggleSelect,
}: {
  meeting: MeetingWithActions;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[meeting.status];
  const StatusIcon = config.icon;
  const attendees = (meeting.attendees ?? []) as MeetingAttendee[];
  const actionItems = (meeting.action_items ?? []) as MeetingActionItem[];
  const decisions = (meeting.decisions ?? []) as string[];
  const completedCount = meeting.actions.filter((a) => a.status === "completed").length;

  return (
    <div className="rounded-lg border border-border bg-card transition-all duration-150">
      <div className="flex items-center gap-3 p-4">
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(meeting.id)}
          />
        </div>
      <button
        className="flex flex-1 items-center gap-3 text-left"
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
      </div>

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
              <ul className="space-y-1.5">
                {actionItems.map((item, i) => (
                  <ActionItemRow
                    key={i}
                    item={item}
                    meetingId={meeting.id}
                    meetingTitle={meeting.title}
                    meetingDate={meeting.meeting_date}
                  />
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

export function MeetingsClient() {
  const queryClient = useQueryClient();
  const { data: meetings = [] } = useQuery<MeetingWithActions[]>({
    queryKey: ["meetings", "list"],
    queryFn: async () => {
      const res = await fetch("/api/meetings?pageSize=200");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? []) as MeetingWithActions[];
    },
  });

  const [statusFilter, setStatusFilter] = useState<"all" | "pending_review" | "reviewed" | "dismissed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; actions_created: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Date range filter — default to last 30 days
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  const [dateFrom, setDateFrom] = useState(formatDateShort(defaultFrom));
  const [dateTo, setDateTo] = useState(formatDateShort(new Date()));

  const refreshMeetings = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["meetings", "list"] });
  }, [queryClient]);

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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkMarkReviewed = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBulkUpdating(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch("/api/meetings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: "reviewed" }),
          })
        )
      );
      const successCount = results.filter((r) => r.status === "fulfilled" && (r.value as Response).ok).length;
      toast.success(`Marked ${successCount} meeting${successCount !== 1 ? "s" : ""} as reviewed`);
      setSelectedIds(new Set());
      await refreshMeetings();
    } catch {
      toast.error("Failed to update meetings");
    } finally {
      setBulkUpdating(false);
    }
  }, [selectedIds, refreshMeetings]);

  // Apply filters
  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return meetings.filter((m) => {
      // Status filter
      if (statusFilter !== "all" && m.status !== statusFilter) return false;

      // Date range filter
      if (m.meeting_date) {
        const meetingDate = m.meeting_date.split("T")[0];
        if (dateFrom && meetingDate < dateFrom) return false;
        if (dateTo && meetingDate > dateTo) return false;
      }

      // Search filter
      if (query) {
        const titleMatch = m.title.toLowerCase().includes(query);
        const attendees = (m.attendees ?? []) as MeetingAttendee[];
        const attendeeMatch = attendees.some((a) => a.name.toLowerCase().includes(query));
        if (!titleMatch && !attendeeMatch) return false;
      }

      return true;
    });
  }, [meetings, statusFilter, dateFrom, dateTo, searchQuery]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selectedIds.has(m.id));

  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((m) => m.id)));
    }
  }, [allFilteredSelected, filtered]);

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

      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by title or attendee..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
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

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2">
          <span className="text-sm text-foreground">
            {selectedIds.size} meeting{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={handleBulkMarkReviewed}
            disabled={bulkUpdating}
          >
            {bulkUpdating ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3" />
            )}
            Mark as Reviewed
          </Button>
        </div>
      )}

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
          <div className="flex items-center gap-2 px-4 py-1">
            <Checkbox
              checked={allFilteredSelected}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs text-muted-foreground">Select all</span>
          </div>
          {filtered.map((meeting) => (
            <MeetingRow
              key={meeting.id}
              meeting={meeting}
              selected={selectedIds.has(meeting.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
