"use client";

import { useState } from "react";
import {
  Mail,
  FileText,
  Handshake,
  UserPlus,
  CheckSquare,
  X,
  Calendar,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Meeting, MeetingActionType } from "@/lib/types/database";

interface MeetingNotificationProps {
  meetings: Meeting[];
}

interface ActionButtonConfig {
  type: MeetingActionType;
  label: string;
  icon: React.ReactNode;
  variant: "default" | "outline" | "secondary" | "ghost";
}

const ACTION_BUTTONS: ActionButtonConfig[] = [
  { type: "follow_up_email", label: "Draft Follow-Up", icon: <Mail className="size-3.5" />, variant: "outline" },
  { type: "create_document", label: "Create Doc", icon: <FileText className="size-3.5" />, variant: "outline" },
  { type: "make_intro", label: "Make Intros", icon: <Handshake className="size-3.5" />, variant: "outline" },
  { type: "add_contact", label: "Add Contacts", icon: <UserPlus className="size-3.5" />, variant: "outline" },
  { type: "create_task", label: "Create Tasks", icon: <CheckSquare className="size-3.5" />, variant: "outline" },
];

function formatMeetingDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const [loadingAction, setLoadingAction] = useState<MeetingActionType | "dismiss" | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [completedActions, setCompletedActions] = useState<Set<MeetingActionType>>(new Set());

  async function handleAction(actionType: MeetingActionType) {
    setLoadingAction(actionType);
    try {
      const res = await fetch("/api/meetings/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meeting.id, action_type: actionType }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Action failed");
      }

      const data = await res.json();
      setCompletedActions((prev) => new Set(prev).add(actionType));

      // Show result-specific toasts
      switch (actionType) {
        case "follow_up_email":
          toast.success("Follow-up email template generated", {
            description: "Email draft is ready for review.",
          });
          break;
        case "create_document":
          toast.success("Meeting document created", {
            description: "Notes have been saved.",
          });
          break;
        case "make_intro":
          toast.success(`${data.intros_count ?? 0} intro template(s) generated`);
          break;
        case "add_contact":
          toast.success(`${data.contacts_added ?? 0} contact(s) added`);
          break;
        case "create_task":
          toast.success(`${data.tasks_created ?? 0} task(s) created`);
          break;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDismiss() {
    setLoadingAction("dismiss");
    try {
      const res = await fetch("/api/meetings/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meeting.id, status: "dismissed" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Dismiss failed");
      }

      setDismissed(true);
      toast.success("Meeting dismissed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dismiss failed");
    } finally {
      setLoadingAction(null);
    }
  }

  if (dismissed) return null;

  const attendeeNames = (meeting.attendees ?? [])
    .map((a) => a.name)
    .filter(Boolean);

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-all duration-150">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{meeting.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              {formatMeetingDate(meeting.meeting_date)}
            </span>
            {attendeeNames.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" />
                {attendeeNames.slice(0, 3).join(", ")}
                {attendeeNames.length > 3 && ` +${attendeeNames.length - 3}`}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0"
          onClick={handleDismiss}
          disabled={loadingAction !== null}
        >
          {loadingAction === "dismiss" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
        </Button>
      </div>

      {meeting.summary && (
        <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
          {meeting.summary}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {ACTION_BUTTONS.map((btn) => {
          const isCompleted = completedActions.has(btn.type);
          const isLoading = loadingAction === btn.type;

          return (
            <Button
              key={btn.type}
              variant={isCompleted ? "secondary" : btn.variant}
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => handleAction(btn.type)}
              disabled={loadingAction !== null || isCompleted}
            >
              {isLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                btn.icon
              )}
              {isCompleted ? `${btn.label} ✓` : btn.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function MeetingNotificationList({ meetings }: MeetingNotificationProps) {
  if (meetings.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="size-4 text-[#F59E0B]" />
        <h2 className="text-sm font-semibold text-foreground">
          Post-Meeting Actions
        </h2>
        <span className="rounded-full bg-[#F59E0B]/20 px-2 py-0.5 text-xs font-medium text-[#F59E0B]">
          {meetings.length}
        </span>
      </div>
      {meetings.map((meeting) => (
        <MeetingCard key={meeting.id} meeting={meeting} />
      ))}
    </div>
  );
}
