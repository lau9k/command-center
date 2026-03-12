"use client";

import Link from "next/link";
import { format, isPast, isToday } from "date-fns";
import { CalendarIcon, ListOrdered } from "lucide-react";
import { ScoreBadge } from "@/components/tasks/priority-badge";
import { ProjectBadge } from "@/components/dashboard/ProjectBadge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface RankedTaskItem {
  id: string;
  project_id: string | null;
  title: string;
  due_date: string | null;
  priority: string;
  score: number;
  factors: string[];
  projects: { id: string; name: string; color: string | null } | null;
}

interface RankedTaskListProps {
  tasks: RankedTaskItem[];
}

export function RankedTaskList({ tasks }: RankedTaskListProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<ListOrdered />}
        title="No ranked tasks"
        description="All tasks are complete or none exist yet"
      />
    );
  }

  return (
    <div className="space-y-1">
      {tasks.map((task) => {
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
              <ScoreBadge score={task.score} factors={task.factors} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{task.title}</p>
                {task.factors[0] && (
                  <p className="truncate text-xs text-muted-foreground">
                    {task.factors[0]}
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
                {task.due_date && (
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      isOverdue
                        ? "font-medium text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="size-3" />
                    {format(new Date(task.due_date), "MMM d")}
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
