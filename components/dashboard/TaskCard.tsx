"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PriorityBadge } from "./PriorityBadge";
import { ProjectBadge } from "./ProjectBadge";
import type { TaskWithProject, TaskStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskWithProject;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: TaskWithProject) => void;
  onDelete: (taskId: string) => void;
}

export function TaskCard({
  task,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const [deleting, setDeleting] = useState(false);
  const isDone = task.status === "done";

  function handleCheckedChange(checked: boolean | "indeterminate") {
    if (checked === "indeterminate") return;
    onStatusChange(task.id, checked ? "done" : "todo");
  }

  async function handleDelete() {
    setDeleting(true);
    onDelete(task.id);
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

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Delete task"
            >
              <Trash2 className="text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{task.title}&rdquo;? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
