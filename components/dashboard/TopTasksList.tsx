"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, isPast, isToday } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PriorityBadge } from "./PriorityBadge";
import { ProjectBadge } from "./ProjectBadge";
import type { TaskWithProject, TaskPriority } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortDashboardTasks(tasks: TaskWithProject[]): TaskWithProject[] {
  const today = new Date().toISOString().split("T")[0];
  return [...tasks].sort((a, b) => {
    // Overdue first
    const aOverdue = a.due_date && a.due_date < today ? 1 : 0;
    const bOverdue = b.due_date && b.due_date < today ? 1 : 0;
    if (bOverdue !== aOverdue) return bOverdue - aOverdue;

    // Then by priority
    const priorityDiff =
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then by due date ascending (nulls last)
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;

    return 0;
  });
}

interface TopTasksListProps {
  initialTasks: TaskWithProject[];
}

export function TopTasksList({ initialTasks }: TopTasksListProps) {
  const [tasks, setTasks] = useState<TaskWithProject[]>(initialTasks);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
            return;
          }

          const { data } = await supabase
            .from("tasks")
            .select("*, projects(id, name, color)")
            .eq("id", payload.new.id)
            .single();

          if (!data) return;
          const task = data as TaskWithProject;

          setTasks((prev) => {
            const exists = prev.find((t) => t.id === task.id);
            if (exists) {
              return prev.map((t) => (t.id === task.id ? task : t));
            }
            return [...prev, task];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const sorted = sortDashboardTasks(activeTasks).slice(0, 20);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-sm text-muted-foreground">
          No active tasks — start a Cowork session to generate some
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sorted.map((task) => {
        const isOverdue =
          task.due_date &&
          isPast(new Date(task.due_date)) &&
          !isToday(new Date(task.due_date));

        return (
          <Link
            key={task.id}
            href={
              task.project_id
                ? `/projects/${task.project_id}/tasks`
                : "/tasks"
            }
            className="group flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent/50"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{task.title}</p>
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
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      isOverdue
                        ? "font-medium text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
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
          </Link>
        );
      })}
    </div>
  );
}
