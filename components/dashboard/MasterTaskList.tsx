"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ListFilter } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskCard } from "./TaskCard";
import { TaskFormDialog } from "./TaskFormDialog";
import type {
  TaskWithProject,
  TaskStatus,
  TaskPriority,
} from "@/lib/types/database";

interface ProjectOption {
  id: string;
  name: string;
}

interface MasterTaskListProps {
  initialTasks: TaskWithProject[];
  projects: ProjectOption[];
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  in_progress: 0,
  todo: 1,
  done: 2,
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortTasks(tasks: TaskWithProject[]): TaskWithProject[] {
  return [...tasks].sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;

    return 0;
  });
}

const ALL_VALUE = "__all__";

export function MasterTaskList({
  initialTasks,
  projects,
}: MasterTaskListProps) {
  const [tasks, setTasks] = useState<TaskWithProject[]>(initialTasks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null);

  const [filterProject, setFilterProject] = useState<string>(ALL_VALUE);
  const [filterPriority, setFilterPriority] = useState<string>(ALL_VALUE);
  const [filterStatus, setFilterStatus] = useState<string>(ALL_VALUE);

  const supabase = createClient();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
            return;
          }

          // For INSERT and UPDATE, refetch the task with project join
          const { data } = await supabase
            .from("tasks")
            .select("*, projects(id, name, color)")
            .eq("id", payload.new.id)
            .single();

          if (!data) return;

          const taskWithProject = data as TaskWithProject;

          setTasks((prev) => {
            const exists = prev.find((t) => t.id === taskWithProject.id);
            if (exists) {
              return prev.map((t) =>
                t.id === taskWithProject.id ? taskWithProject : t
              );
            }
            return [...prev, taskWithProject];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t))
      );

      const { error } = await supabase
        .from("tasks")
        .update({ status })
        .eq("id", taskId);

      if (error) {
        // Revert on error
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, status: t.status === status ? "todo" : t.status }
              : t
          )
        );
      }
    },
    [supabase]
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      const taskToDelete = tasks.find((t) => t.id === taskId);
      // Optimistic delete
      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error && taskToDelete) {
        // Revert on error
        setTasks((prev) => [...prev, taskToDelete]);
      }
    },
    [supabase, tasks]
  );

  const handleEdit = useCallback((task: TaskWithProject) => {
    setEditingTask(task);
    setDialogOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (
      data: {
        title: string;
        description: string;
        project_id: string;
        priority: TaskPriority;
        status: TaskStatus;
        due_date: string | null;
        assignee: string;
      },
      taskId?: string
    ) => {
      const payload = {
        title: data.title,
        description: data.description || null,
        project_id: data.project_id || null,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date,
        assignee: data.assignee || null,
      };

      if (taskId) {
        await supabase.from("tasks").update(payload).eq("id", taskId);
      } else {
        await supabase.from("tasks").insert(payload);
      }

      setEditingTask(null);
    },
    [supabase]
  );

  function handleOpenCreate() {
    setEditingTask(null);
    setDialogOpen(true);
  }

  const filtered = tasks.filter((t) => {
    if (filterProject !== ALL_VALUE && t.project_id !== filterProject)
      return false;
    if (filterPriority !== ALL_VALUE && t.priority !== filterPriority)
      return false;
    if (filterStatus !== ALL_VALUE && t.status !== filterStatus) return false;
    return true;
  });

  const sorted = sortTasks(filtered);

  const hasFilters =
    filterProject !== ALL_VALUE ||
    filterPriority !== ALL_VALUE ||
    filterStatus !== ALL_VALUE;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Master Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} across all
            projects
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <ListFilter className="size-4 text-muted-foreground" />
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterProject(ALL_VALUE);
              setFilterPriority(ALL_VALUE);
              setFilterStatus(ALL_VALUE);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Task list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? "No tasks match the current filters."
              : "No tasks yet. Create your first task."}
          </p>
          {!hasFilters && (
            <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
              <Plus />
              Create Task
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        projects={projects}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
