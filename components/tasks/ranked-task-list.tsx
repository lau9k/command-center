"use client";

import { useEffect, useState } from "react";
import { CalendarIcon, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ScoreBadge } from "./priority-badge";
import { TaskRecurrenceBadge } from "./TaskRecurrenceBadge";
import { PriorityBadge } from "@/components/dashboard/PriorityBadge";
import { ProjectBadge } from "@/components/dashboard/ProjectBadge";
import type { TaskWithProject } from "@/lib/types/database";
import type { ScoringFactor } from "@/lib/task-scoring";

interface RankedTask extends TaskWithProject {
  score: number;
  factors: ScoringFactor[];
}

export function RankedTaskList({ initial }: { initial: RankedTask[] }) {
  const [tasks, setTasks] = useState<RankedTask[]>(initial);

  useEffect(() => {
    setTasks(initial);
  }, [initial]);

  if (tasks.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No open tasks to prioritize.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 pb-2">
        <ArrowUpDown className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Priority-Ranked Tasks
        </h3>
        <span className="text-xs text-muted-foreground">
          ({tasks.length} open)
        </span>
      </div>
      <div className="space-y-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors hover:bg-accent/50"
          >
            <ScoreBadge score={task.score} factors={task.factors} />
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
              {task.recurrence_rule && (
                <TaskRecurrenceBadge recurrenceRule={task.recurrence_rule} />
              )}
              <PriorityBadge priority={task.priority} />
              {task.due_date && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarIcon className="size-3" />
                  {format(new Date(task.due_date), "MMM d")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
