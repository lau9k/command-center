"use client";

import { useState, useCallback } from "react";
import {
  Mail,
  Calendar,
  ArrowRightLeft,
  StickyNote,
  Clock,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Contact } from "@/lib/types/database";

export interface ActivityEvent {
  id: string;
  type: "email" | "meeting" | "stage_change" | "note" | "created" | "updated";
  title: string;
  description?: string;
  timestamp: string;
}

interface ActivityTimelineProps {
  contact: Contact;
  events: ActivityEvent[];
  onAddNote: (note: string) => Promise<void>;
}

const eventConfig: Record<
  ActivityEvent["type"],
  { icon: React.ElementType; color: string }
> = {
  email: { icon: Mail, color: "bg-blue-500" },
  meeting: { icon: Calendar, color: "bg-purple-500" },
  stage_change: { icon: ArrowRightLeft, color: "bg-orange-500" },
  note: { icon: StickyNote, color: "bg-green-500" },
  created: { icon: Clock, color: "bg-muted-foreground" },
  updated: { icon: Clock, color: "bg-muted-foreground" },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function ActivityTimeline({
  events,
  onAddNote,
}: ActivityTimelineProps) {
  const [noteText, setNoteText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const handleSubmitNote = useCallback(async () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onAddNote(trimmed);
      setNoteText("");
      setShowNoteForm(false);
    } finally {
      setSubmitting(false);
    }
  }, [noteText, onAddNote]);

  return (
    <div className="space-y-4">
      {/* Timeline events */}
      <div className="relative space-y-0">
        {events.length === 0 && (
          <p className="py-3 text-center text-sm text-muted-foreground">
            No activity yet
          </p>
        )}

        {events.map((event, idx) => {
          const config = eventConfig[event.type];
          const Icon = config.icon;
          const isLast = idx === events.length - 1;

          return (
            <div key={event.id} className="relative flex gap-3 pb-4">
              {/* Vertical connector line */}
              {!isLast && (
                <div className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border" />
              )}

              {/* Icon dot */}
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${config.color}`}
              >
                <Icon className="size-3 text-white" />
              </div>

              {/* Event content */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">
                  {event.title}
                </p>
                {event.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatTimestamp(event.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Note Section */}
      {showNoteForm ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <Textarea
            placeholder="Write a note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowNoteForm(false);
                setNoteText("");
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitNote}
              disabled={!noteText.trim() || submitting}
            >
              {submitting ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : null}
              Save Note
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => setShowNoteForm(true)}
        >
          <Plus className="size-3.5" />
          Add Note
        </Button>
      )}
    </div>
  );
}
