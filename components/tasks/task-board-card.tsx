"use client";

import { format, isPast, isToday } from "date-fns";
import { CalendarIcon, GripVertical, ShieldAlert, AlertTriangle } from "lucide-react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import type { TaskWithProject, TaskPriority } from "@/lib/types/database";

type GovernanceStatus = "BLOCKED" | "HANDLE_WITH_CARE" | "CLEAR";

interface TaskBoardCardProps {
  task: TaskWithProject;
  onClick: (task: TaskWithProject) => void;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  governanceStatus?: GovernanceStatus;
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-gray-400",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function TaskBoardCard({ task, onClick, dragHandleProps, governanceStatus }: TaskBoardCardProps) {
  const isOverdue =
    task.due_date && task.status !== "done" && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));
  const isBlocked = governanceStatus === "BLOCKED";

  return (
    <div
      onClick={() => onClick(task)}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50",
        isBlocked && "opacity-50"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="mt-0.5 shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        >
          <GripVertical className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Title row with governance badge */}
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-sm font-medium text-foreground">
              {task.title}
            </h4>
            {governanceStatus === "BLOCKED" && (
              <span title="Blocked — outreach not permitted">
                <ShieldAlert className="size-4 shrink-0 text-red-500" />
              </span>
            )}
            {governanceStatus === "HANDLE_WITH_CARE" && (
              <span title="Handle with care">
                <AlertTriangle className="size-4 shrink-0 text-yellow-500" />
              </span>
            )}
          </div>

          {/* Bottom row: project badge, priority dot, due date, effort */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Project badge */}
            {task.projects && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: task.projects.color
                    ? `${task.projects.color}20`
                    : undefined,
                  color: task.projects.color ?? undefined,
                }}
              >
                {task.projects.name}
              </span>
            )}

            {/* Priority dot */}
            <span
              className="flex items-center gap-1 text-[10px] text-muted-foreground"
              title={PRIORITY_LABELS[task.priority]}
            >
              <span className={cn("size-2 rounded-full", PRIORITY_DOT[task.priority])} />
              {PRIORITY_LABELS[task.priority]}
            </span>

            {/* Due date */}
            {task.due_date && (
              <span
                className={cn(
                  "flex items-center gap-0.5 text-[10px]",
                  isOverdue
                    ? "font-medium text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                )}
              >
                <CalendarIcon className="size-2.5" />
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}

            {/* Assignee */}
            {task.assignee && (
              <span className="text-[10px] text-muted-foreground">
                {task.assignee}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
