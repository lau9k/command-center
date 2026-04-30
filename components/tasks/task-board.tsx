"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Drawer } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { TaskBoardColumn } from "./task-board-column";
import type {
  TaskWithProject,
  TaskStatus,
  TaskPriority,
} from "@/lib/types/database";
import { format } from "date-fns";
import { CalendarIcon, Tag, User, FileText } from "lucide-react";
import { sanitizeText } from "@/lib/sanitize";
import { TaskActionButtons } from "./TaskActionButtons";
import { useGovernanceCheck, type GovernanceMap } from "@/lib/hooks/useGovernanceCheck";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { SYSTEM_TAGS } from "@/lib/constants/tags";

type ColumnConfig = {
  status: TaskStatus;
  label: string;
  dotClass: string;
  borderClass: string;
};

const OPEN_COLUMNS: ColumnConfig[] = [
  { status: "todo", label: "To Do", dotClass: "bg-blue-500", borderClass: "border-l-blue-500" },
  { status: "in_progress", label: "In Progress", dotClass: "bg-yellow-500", borderClass: "border-l-yellow-500" },
  { status: "blocked", label: "Blocked", dotClass: "bg-red-500", borderClass: "border-l-red-500" },
];

const DONE_COLUMN: ColumnConfig = {
  status: "done",
  label: "Done",
  dotClass: "bg-green-500",
  borderClass: "border-l-green-500",
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function DrawerContent({ task }: { task: TaskWithProject }) {
  const displayTags = (task.tags ?? []).filter(
    (tag) => !SYSTEM_TAGS.includes(tag.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Action Buttons */}
      <TaskActionButtons task={task} />

      {/* Status */}
      <div>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Status
        </h4>
        <p className="text-sm capitalize text-foreground">
          {task.status.replace("_", " ")}
        </p>
      </div>

      {/* Priority */}
      <div>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Priority
        </h4>
        <p className="text-sm capitalize text-foreground">{task.priority}</p>
      </div>

      {/* Project */}
      {task.projects && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Project
          </h4>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: task.projects.color ?? "#6B7280" }}
            />
            {task.projects.name}
          </div>
        </div>
      )}

      {/* Due date */}
      {task.due_date && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Due Date
          </h4>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <CalendarIcon className="size-4 text-muted-foreground" />
            {format(new Date(task.due_date), "MMM d, yyyy")}
          </div>
        </div>
      )}

      {/* Assignee */}
      {task.assignee && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Assignee
          </h4>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <User className="size-4 text-muted-foreground" />
            {task.assignee}
          </div>
        </div>
      )}

      {/* Description */}
      {task.description && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Description
          </h4>
          <div className="flex items-start gap-1.5 text-sm text-foreground">
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="whitespace-pre-wrap">{sanitizeText(task.description)}</p>
          </div>
        </div>
      )}

      {/* Tags */}
      {displayTags.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tags
          </h4>
          <div className="flex flex-wrap gap-1">
            {displayTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground"
              >
                <Tag className="size-2.5" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="border-t border-border pt-4">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>
            Created {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}
          </span>
          <span>
            Updated {format(new Date(task.updated_at), "MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TaskBoard() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showDone = searchParams.get("showDone") === "1";
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);

  const toggleShowDone = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (showDone) {
      params.delete("showDone");
    } else {
      params.set("showDone", "1");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, showDone]);

  const columns = useMemo<ColumnConfig[]>(
    () => (showDone ? [...OPEN_COLUMNS, DONE_COLUMN] : OPEN_COLUMNS),
    [showDone]
  );

  const { data: tasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: ["tasks", "list"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return (json.data as TaskWithProject[]) ?? [];
    },
    staleTime: 30_000,
  });

  // Extract emails from outreach tasks with contacts for governance checking
  const outreachEmails = useMemo(() => {
    const emails: string[] = [];
    for (const task of tasks) {
      if (task.task_type === "outreach" && task.contacts?.email) {
        emails.push(task.contacts.email);
      }
    }
    return [...new Set(emails)];
  }, [tasks]);

  const { data: governanceMap = {} } = useGovernanceCheck(outreachEmails);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithProject[]> = {
      todo: [],
      in_progress: [],
      done: [],
      blocked: [],
    };
    for (const task of tasks) {
      grouped[task.status]?.push(task);
    }
    // Sort each column by priority
    for (const status of Object.keys(grouped) as TaskStatus[]) {
      grouped[status].sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      );
    }
    return grouped;
  }, [tasks]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return;

      const taskId = result.draggableId;
      const newStatus = result.destination.droppableId as TaskStatus;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Skip if dropped in same column
      if (task.status === newStatus) return;

      // Optimistic update
      const previous = queryClient.getQueryData<TaskWithProject[]>(["tasks", "list"]);
      queryClient.setQueryData<TaskWithProject[]>(["tasks", "list"], (old) =>
        old?.map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, updated_at: new Date().toISOString() }
            : t
        )
      );

      const actionResult = await updateTaskStatus(taskId, newStatus);
      if (actionResult.success) {
        toast.success(
          newStatus === "done" ? "Task completed" : "Status updated"
        );
      } else {
        queryClient.setQueryData(["tasks", "list"], previous);
        toast.error(actionResult.error ?? "Failed to update status");
      }
    },
    [tasks, queryClient]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleShowDone}
          aria-pressed={showDone}
        >
          {showDone ? "Hide done column" : "Show done column"}
        </Button>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <TaskBoardColumn
              key={col.status}
              status={col.status}
              label={col.label}
              dotClass={col.dotClass}
              borderClass={col.borderClass}
              tasks={tasksByStatus[col.status]}
              onCardClick={setSelectedTask}
              governanceMap={governanceMap}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Detail Drawer */}
      <Drawer
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.title ?? "Task Details"}
      >
        {selectedTask ? (
          <DrawerContent task={selectedTask} />
        ) : (
          <div />
        )}
      </Drawer>
    </div>
  );
}
