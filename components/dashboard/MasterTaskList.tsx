"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  ListFilter,
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
} from "lucide-react";
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

import { TaskForm } from "./TaskForm";
import type { TaskFormData } from "./TaskForm";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { TaskDetailDrawer } from "@/components/task-detail-drawer";
import { BulkActionBar } from "@/components/tasks/BulkActionBar";
import { useTaskSelection } from "@/hooks/useTaskSelection";
import type {
  TaskWithProject,
  TaskStatus,
  TaskPriority,
} from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { SharedEmptyState } from "@/components/shared/EmptyState";
import { EmptyState } from "@/components/ui/empty-state";

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
  kpis: TaskKpis;
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  in_progress: 0,
  todo: 1,
  blocked: 2,
  done: 3,
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

const STATUS_CHIPS: { label: string; value: TaskStatus | typeof ALL_VALUE }[] = [
  { label: "Active", value: ALL_VALUE },
  { label: "Todo", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Blocked", value: "blocked" },
  { label: "Done", value: "done" },
];

export function MasterTaskList({
  kpis,
}: MasterTaskListProps) {
  const queryClient = useQueryClient();

  const { data: tasks = [], isFetching: isFetchingTasks } = useQuery<TaskWithProject[]>({
    queryKey: ["tasks", "list"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return (json.data as TaskWithProject[]) ?? [];
    },
    staleTime: 30_000,
  });

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ["projects", "list"],
    // Projects are prefetched on the server; no client-side API route needed yet.
    // staleTime: Infinity prevents refetch until we add a /api/projects route.
    staleTime: Infinity,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null);
  const [search, setSearch] = useState("");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<TaskWithProject | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Detail drawer state
  const [selectedTask, setSelectedTask] = useState<TaskWithProject | null>(null);

  const [filterProject, setFilterProject] = useState<string>(ALL_VALUE);
  const [filterPriority, setFilterPriority] = useState<string>(ALL_VALUE);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | typeof ALL_VALUE>(ALL_VALUE);
  const [filterType, setFilterType] = useState<string>(ALL_VALUE);

  const refreshTasks = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tasks", "list"] });
  }, [queryClient]);

  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      // Snapshot for rollback
      const previous = queryClient.getQueryData<TaskWithProject[]>(["tasks", "list"]);

      // Optimistic update
      queryClient.setQueryData<TaskWithProject[]>(["tasks", "list"], (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, status } : t))
      );

      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success(
          status === "done" ? "Task completed" : "Task status updated"
        );
      } catch {
        // Revert on error
        queryClient.setQueryData(["tasks", "list"], previous);
        toast.error("Failed to update status — try again");
      }
    },
    [queryClient]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    // Snapshot for rollback
    const previous = queryClient.getQueryData<TaskWithProject[]>(["tasks", "list"]);

    // Optimistic delete
    queryClient.setQueryData<TaskWithProject[]>(["tasks", "list"], (old) =>
      old?.filter((t) => t.id !== deleteTarget.id)
    );

    try {
      const res = await fetch(`/api/tasks/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Task deleted");
      setDeleteTarget(null);
    } catch {
      // Revert on error
      queryClient.setQueryData(["tasks", "list"], previous);
      toast.error("Failed to delete — try again");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, queryClient]);

  const handleEdit = useCallback((task: TaskWithProject) => {
    setEditingTask(task);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: TaskFormData, taskId?: string) => {
      const payload = {
        title: data.title,
        description: data.description || null,
        project_id: data.project_id || null,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date,
        assignee: data.assignee || null,
      };

      try {
        if (taskId) {
          const res = await fetch(`/api/tasks/${taskId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("Failed to update task");
          toast.success("Task updated");
        } else {
          const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("Failed to create task");
          toast.success("Task created");
        }

        await refreshTasks();
        setEditingTask(null);
      } catch {
        toast.error("Failed to save — try again");
        throw new Error("save failed");
      }
    },
    [refreshTasks]
  );

  function handleOpenCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  const applyFilters = (t: TaskWithProject) => {
    if (filterProject !== ALL_VALUE && t.project_id !== filterProject) return false;
    if (filterPriority !== ALL_VALUE && t.priority !== filterPriority) return false;
    if (filterStatus === ALL_VALUE && t.status === "done") return false;
    if (filterStatus !== ALL_VALUE && t.status !== filterStatus) return false;
    if (filterType === "outreach") {
      if (!t.tags?.some((tag) => tag.toLowerCase() === "outreach")) return false;
    } else if (filterType === "cross-project") {
      if (t.tags?.some((tag) => tag.toLowerCase() === "outreach")) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!t.title.toLowerCase().includes(q)) return false;
    }
    return true;
  };

  const visibleIds = tasks.filter(applyFilters).map((t) => t.id);

  const selection = useTaskSelection(visibleIds);

  const filtered = tasks.filter(applyFilters);

  const sorted = sortTasks(filtered);

  const hasFilters =
    filterProject !== ALL_VALUE ||
    filterPriority !== ALL_VALUE ||
    filterStatus !== ALL_VALUE ||
    filterType !== ALL_VALUE;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""} across all projects
          {isFetchingTasks && (
            <RefreshCw className="ml-2 inline size-4 animate-spin text-muted-foreground" />
          )}
        </p>
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

      {/* Status filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setFilterStatus(chip.value)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
              filterStatus === chip.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
            )}
          >
            {chip.label}
            {chip.value !== ALL_VALUE && (
              <span className="ml-1.5 tabular-nums">
                {tasks.filter((t) => t.status === chip.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-auto sm:flex-1">
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

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Types</SelectItem>
            <SelectItem value="outreach">Outreach</SelectItem>
            <SelectItem value="cross-project">Cross-Project</SelectItem>
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

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterProject(ALL_VALUE);
              setFilterPriority(ALL_VALUE);
              setFilterStatus(ALL_VALUE);
              setFilterType(ALL_VALUE);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Task list */}
      {sorted.length === 0 && tasks.length === 0 && !hasFilters ? (
        <SharedEmptyState
          icon={<CheckSquare className="size-12" />}
          title="No tasks yet"
          description="Create your first task to start tracking work across projects."
          action={{ label: "+ Add Task", onClick: handleOpenCreate }}
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={hasFilters ? <ListFilter /> : <CheckSquare />}
          title={hasFilters ? "No results match your filters" : "No tasks yet"}
          description={hasFilters ? "Try adjusting or clearing your filters to see tasks." : "Create your first task to start tracking work across projects."}
          action={hasFilters ? { label: "Clear filters", onClick: () => { setFilterProject(ALL_VALUE); setFilterPriority(ALL_VALUE); setFilterStatus(ALL_VALUE); setFilterType(ALL_VALUE); } } : { label: "+ Add Task", onClick: handleOpenCreate }}
        />
      ) : (
        <div className="space-y-2">
          {/* Select all header */}
          <div className="flex items-center gap-3 px-4 py-1.5">
            <Checkbox
              checked={selection.allSelected ? true : selection.someSelected ? "indeterminate" : false}
              onCheckedChange={() => selection.toggleAll()}
              aria-label="Select all visible tasks"
            />
            <span className="text-xs text-muted-foreground">
              {selection.count > 0
                ? `${selection.count} selected`
                : "Select all"}
            </span>
          </div>
          {sorted.map((task) => (
            <div key={task.id} className="flex items-center gap-0">
              <div className="flex shrink-0 items-center pl-4">
                <Checkbox
                  checked={selection.selectedIds.has(task.id)}
                  onCheckedChange={() => selection.toggle(task.id)}
                  aria-label={`Select "${task.title}"`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <TaskCard
                  task={task}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onClick={setSelectedTask}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        projects={projects}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete task"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`
            : undefined
        }
        onConfirm={handleDelete}
        loading={deleting}
      />

      <TaskDetailDrawer
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={(updated) => {
          queryClient.setQueryData<TaskWithProject[]>(["tasks", "list"], (old) =>
            old?.map((t) => (t.id === updated.id ? updated : t))
          );
          setSelectedTask(updated);
        }}
        onDelete={(id) => {
          queryClient.setQueryData<TaskWithProject[]>(["tasks", "list"], (old) =>
            old?.filter((t) => t.id !== id)
          );
          setSelectedTask(null);
        }}
      />

      <BulkActionBar
        selectedIds={selection.selectedIds}
        onClear={selection.clear}
        onBulkUpdate={refreshTasks}
      />
    </div>
  );
}
