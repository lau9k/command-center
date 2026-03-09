"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  ListFilter,
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskCard } from "./TaskCard";
import { TaskQuickAdd } from "./TaskQuickAdd";
import { TaskFormDialog } from "./TaskFormDialog";
import type {
  TaskWithProject,
  TaskStatus,
  TaskPriority,
} from "@/lib/types/database";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";

interface ProjectOption {
  id: string;
  name: string;
}

interface TaskKpis {
  totalOpen: number;
  dueThisWeek: number;
  overdue: number;
  completedThisWeek: number;
}

interface MasterTaskListProps {
  initialTasks: TaskWithProject[];
  projects: ProjectOption[];
  kpis: TaskKpis;
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
    // Primary: priority desc (critical/high first)
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Secondary: due date asc (soonest first)
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;

    // Tertiary: status (in_progress, todo, done)
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;

    return 0;
  });
}

const ALL_VALUE = "__all__";

export function MasterTaskList({
  initialTasks,
  projects,
  kpis,
}: MasterTaskListProps) {
  const [tasks, setTasks] = useState<TaskWithProject[]>(initialTasks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null);
  const [quickAdding, setQuickAdding] = useState(false);
  const [search, setSearch] = useState("");

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

  const handleQuickAdd = useCallback(
    async (title: string) => {
      setQuickAdding(true);
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            status: "todo",
            priority: "medium",
          }),
        });
        if (res.ok) {
          const { data } = await res.json();
          setTasks((prev) => [data, ...prev]);
        }
      } finally {
        setQuickAdding(false);
      }
    },
    []
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
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q)) return false;
    }
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

      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Total Open"
          value={kpis.totalOpen}
          subtitle="tasks to do"
          icon={<CheckSquare className="size-5" />}
        />
        <KpiCard
          label="Due This Week"
          value={kpis.dueThisWeek}
          subtitle="upcoming deadlines"
          icon={<Clock className="size-5" />}
        />
        <KpiCard
          label="Overdue"
          value={kpis.overdue}
          subtitle="past due date"
          icon={<AlertTriangle className="size-5" />}
        />
        <KpiCard
          label="Completed This Week"
          value={kpis.completedThisWeek}
          subtitle="recently finished"
          icon={<CheckCircle2 className="size-5" />}
        />
      </section>

      {/* Quick-add bar */}
      <TaskQuickAdd onAdd={handleQuickAdd} disabled={quickAdding} />

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ListFilter className="hidden size-4 text-muted-foreground sm:block" />
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
      {sorted.length === 0 && tasks.length === 0 && !hasFilters ? (
        <ModuleEmptyState module="tasks" />
      ) : sorted.length === 0 ? (
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
