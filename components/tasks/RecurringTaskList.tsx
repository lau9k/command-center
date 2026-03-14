"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Plus,
  Repeat,
  CalendarIcon,
  Pencil,
  Trash2,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/dashboard/PriorityBadge";
import { ProjectBadge } from "@/components/dashboard/ProjectBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RecurringTaskForm } from "./RecurringTaskForm";
import { getNextRunDate } from "@/lib/recurring-tasks";
import type { TaskWithProject } from "@/lib/types/database";

interface ProjectOption {
  id: string;
  name: string;
  color: string | null;
}

interface RecurringTaskListProps {
  initial: TaskWithProject[];
  projects: ProjectOption[];
}

function formatFrequency(rule: string | null): string {
  switch (rule) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "weekdays":
      return "Mon\u2013Fri";
    case "monthly":
      return "Monthly";
    default:
      return rule ?? "None";
  }
}

export function RecurringTaskList({ initial, projects }: RecurringTaskListProps) {
  const [tasks, setTasks] = useState<TaskWithProject[]>(initial);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskWithProject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshList = useCallback(async () => {
    const res = await fetch("/api/tasks/recurring");
    if (res.ok) {
      const json = await res.json();
      setTasks(json.data ?? []);
    }
  }, []);

  function handleEdit(task: TaskWithProject) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleAdd() {
    setEditingTask(null);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/recurring/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleFormSubmit() {
    setFormOpen(false);
    setEditingTask(null);
    await refreshList();
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Recurring Templates
            </h3>
            <span className="text-xs text-muted-foreground">
              ({tasks.length})
            </span>
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-1.5 size-3.5" />
            Add Schedule
          </Button>
        </div>

        {tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No recurring task schedules yet. Create one to automatically
            generate tasks on a schedule.
          </p>
        ) : (
          <div className="space-y-1">
            {tasks.map((task) => {
              const nextRun = getNextRunDate(
                task.due_date,
                task.recurrence_rule
              );
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
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
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
                      <Repeat className="size-3" />
                      {formatFrequency(task.recurrence_rule)}
                    </span>
                    <PriorityBadge priority={task.priority} />

                    {nextRun && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarIcon className="size-3" />
                        {format(new Date(nextRun), "MMM d")}
                      </span>
                    )}

                    {task.due_date && (
                      <span
                        className="flex items-center gap-1 text-xs text-muted-foreground"
                        title="Last run"
                      >
                        <Hash className="size-3" />
                        {format(new Date(task.due_date), "MMM d")}
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => handleEdit(task)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(task)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RecurringTaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        projects={projects}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Task</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the recurring schedule &ldquo;
              {deleteTarget?.title}&rdquo;. Previously generated tasks will not
              be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting\u2026" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
