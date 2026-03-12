"use client";

import { format } from "date-fns";
import { CalendarIcon, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "./PriorityBadge";
import { ProjectBadge } from "./ProjectBadge";
import type { TaskWithProject, TaskStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/design-tokens";

interface TaskCardProps {
  task: TaskWithProject;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: TaskWithProject) => void;
  onDelete: (task: TaskWithProject) => void;
}

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
  blocked: "todo",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Open",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: statusBadgeClass.scheduled + " border-[#3B82F6]/20",
  in_progress: statusBadgeClass.ready + " border-[#EAB308]/20",
  done: statusBadgeClass.active + " border-[#22C55E]/20",
  blocked: statusBadgeClass.failed + " border-[#EF4444]/20",
};

export function TaskCard({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const isDone = task.status === "done";

  function handleCheckedChange(checked: boolean | "indeterminate") {
    if (checked === "indeterminate") return;
    onStatusChange(task.id, checked ? "done" : "todo");
  }

  function handleStatusCycle() {
    onStatusChange(task.id, STATUS_CYCLE[task.status]);
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent/50",
        isDone && "opacity-60"
      )}
    >
      <Checkbox
        checked={isDone}
        onCheckedChange={handleCheckedChange}
        aria-label={`Mark "${task.title}" as ${isDone ? "incomplete" : "complete"}`}
      />

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-medium",
              isDone && "line-through"
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {task.projects && (
            <ProjectBadge
              name={task.projects.name}
              color={task.projects.color}
            />
          )}
          <PriorityBadge priority={task.priority} />
          <button
            type="button"
            onClick={handleStatusCycle}
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80 cursor-pointer",
              STATUS_COLORS[task.status]
            )}
            title="Click to cycle status"
          >
            {STATUS_LABELS[task.status]}
          </button>
          {task.due_date && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="size-3" />
              {format(new Date(task.due_date), "MMM d")}
            </span>
          )}
          {task.assignee && (
            <span className="text-xs text-muted-foreground">
              {task.assignee}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit(task)}
          aria-label="Edit task"
        >
          <Pencil />
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => onDelete(task)}
          aria-label="Delete task"
        >
          <Trash2 className="text-destructive" />
        </Button>
      </div>
    </div>
  );
}
