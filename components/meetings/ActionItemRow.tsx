"use client";

import { useState } from "react";
import { CheckCircle2, ListTodo, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MeetingActionItem } from "@/lib/types/database";

interface ActionItemRowProps {
  item: MeetingActionItem;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string | null;
}

export function ActionItemRow({
  item,
  meetingId,
  meetingTitle,
  meetingDate,
}: ActionItemRowProps) {
  const [loading, setLoading] = useState(false);
  const [converted, setConverted] = useState(false);

  const handleCreateTask = async () => {
    setLoading(true);
    try {
      const dateLabel = meetingDate
        ? new Date(meetingDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "unknown date";

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          description: `From meeting: ${meetingTitle} on ${dateLabel}`,
          status: "todo",
          priority: "medium",
          task_type: "follow-up" as const,
          assignee: item.assignee ?? undefined,
          due_date: item.due_date
            ? new Date(item.due_date).toISOString()
            : undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to create task");
      }

      // Record the conversion as a meeting action
      await fetch("/api/meetings/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: meetingId,
          action_type: "create_task",
        }),
      });

      setConverted(true);
      toast.success("Task created", {
        description: item.title,
        action: {
          label: "View tasks",
          onClick: () => {
            window.location.href = "/tasks";
          },
        },
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create task"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <li className="flex items-center gap-2 text-sm text-foreground">
      <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1">{item.title}</span>
      {item.assignee && (
        <span className="text-xs text-muted-foreground">
          — {item.assignee}
        </span>
      )}
      {item.due_date && (
        <span className="text-xs text-muted-foreground">
          Due: {item.due_date}
        </span>
      )}
      {converted ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#22C55E]/20 px-2 py-0.5 text-xs font-medium text-[#22C55E]">
          <CheckCircle2 className="size-3" />
          Task Created
        </span>
      ) : (
        <Button
          variant="secondary"
          size="xs"
          className="h-6 gap-1 text-xs"
          onClick={handleCreateTask}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <ListTodo className="size-3" />
          )}
          Create Task
        </Button>
      )}
    </li>
  );
}
