import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { scoreTask } from "@/lib/task-scoring";
import type {
  Task,
  TaskWithProject,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskOutreachStatus,
} from "@/lib/types/database";

// ── Select clauses ───────────────────────────────────────

const TASK_WITH_RELATIONS =
  "*, projects(id, name, color), contacts(name, email, company, linkedin_url)" as const;

// ── Read ─────────────────────────────────────────────────

export async function getTaskById(id: string): Promise<TaskWithProject | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_WITH_RELATIONS)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    throw error;
  }

  return data as TaskWithProject;
}

export interface GetTasksByProjectOptions {
  projectId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  search?: string;
}

export async function getTasksByProject(
  options: GetTasksByProjectOptions
): Promise<TaskWithProject[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("tasks")
    .select(TASK_WITH_RELATIONS)
    .eq("project_id", options.projectId)
    .order("priority", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });

  if (options.status) {
    query = query.eq("status", options.status);
  }
  if (options.priority) {
    query = query.eq("priority", options.priority);
  }
  if (options.type) {
    query = query.eq("task_type", options.type);
  }
  if (options.search) {
    query = query.ilike("title", `%${options.search}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as TaskWithProject[];
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  projectId?: string;
  assignee?: string;
  type?: string;
  contactId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getTasks(
  filters?: TaskFilters
): Promise<TaskWithProject[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("tasks")
    .select(TASK_WITH_RELATIONS)
    .order("priority", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });

  if (filters?.projectId) {
    query = query.eq("project_id", filters.projectId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.priority) {
    query = query.eq("priority", filters.priority);
  }
  if (filters?.type) {
    query = query.eq("task_type", filters.type);
  }
  if (filters?.contactId) {
    query = query.eq("contact_id", filters.contactId);
  }
  if (filters?.assignee) {
    query = query.eq("assignee", filters.assignee);
  }
  if (filters?.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }
  if (filters?.dateFrom) {
    query = query.gte("due_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("due_date", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as TaskWithProject[];
}

export async function getRankedTasks(
  limit?: number
): Promise<TaskWithProject[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_WITH_RELATIONS)
    .neq("status", "done");

  if (error) throw error;

  const tasks = (data ?? []) as TaskWithProject[];

  const scored = tasks
    .map((task) => ({
      task,
      score: scoreTask(task, task.projects).score,
    }))
    .sort((a, b) => b.score - a.score);

  const sorted = scored.map(({ task }) => task);
  return limit ? sorted.slice(0, limit) : sorted;
}

export async function getRecurringTasks(): Promise<TaskWithProject[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_WITH_RELATIONS)
    .eq("is_recurring_template", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as TaskWithProject[];
}

// ── Write ────────────────────────────────────────────────

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  project_id?: string | null;
  assignee?: string | null;
  recurrence_rule?: string | null;
  recurrence_parent_id?: string | null;
  is_recurring_template?: boolean;
  contact_id?: string | null;
  task_type?: TaskType;
  external_url?: string | null;
  outreach_status?: TaskOutreachStatus;
  sent_at?: string | null;
  response_notes?: string | null;
  tags?: string[] | null;
  user_id?: string;
}

export async function createTask(
  input: CreateTaskInput
): Promise<TaskWithProject> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .insert(input)
    .select(TASK_WITH_RELATIONS)
    .single();

  if (error) throw error;

  return data as TaskWithProject;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  project_id?: string | null;
  assignee?: string | null;
  recurrence_rule?: string | null;
  is_recurring_template?: boolean;
  contact_id?: string | null;
  task_type?: TaskType;
  external_url?: string | null;
  outreach_status?: TaskOutreachStatus;
  sent_at?: string | null;
  response_notes?: string | null;
  tags?: string[] | null;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<TaskWithProject> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .update(input)
    .eq("id", id)
    .select(TASK_WITH_RELATIONS)
    .single();

  if (error) throw error;

  return data as TaskWithProject;
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) throw error;
}

// ── Bulk ─────────────────────────────────────────────────

export interface BulkUpdateInput {
  status?: TaskStatus;
  priority?: TaskPriority;
}

export async function bulkUpdateTasks(
  ids: string[],
  updates: BulkUpdateInput
): Promise<TaskWithProject[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .in("id", ids)
    .select(TASK_WITH_RELATIONS);

  if (error) throw error;

  return (data ?? []) as TaskWithProject[];
}

export async function bulkDeleteTasks(ids: string[]): Promise<number> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .in("id", ids)
    .select("id");

  if (error) throw error;

  return data?.length ?? 0;
}

export async function batchUpdateOutreachStatus(
  taskIds: string[],
  outreachStatus: TaskOutreachStatus,
  sentAt?: string | null
): Promise<TaskWithProject[]> {
  const supabase = createServiceClient();

  const updates: UpdateTaskInput = {
    outreach_status: outreachStatus,
    sent_at:
      outreachStatus === "sent" && !sentAt
        ? new Date().toISOString()
        : sentAt ?? undefined,
  };

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .in("id", taskIds)
    .select(TASK_WITH_RELATIONS);

  if (error) throw error;

  return (data ?? []) as TaskWithProject[];
}

// ── Recurring ────────────────────────────────────────────

export async function deleteRecurringTask(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("is_recurring_template")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;
  if (!task?.is_recurring_template) {
    throw new Error("Task is not a recurring template");
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) throw error;
}

export async function updateRecurringTask(
  id: string,
  input: UpdateTaskInput
): Promise<TaskWithProject> {
  const supabase = createServiceClient();

  const { data: existing, error: fetchError } = await supabase
    .from("tasks")
    .select("is_recurring_template")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;
  if (!existing?.is_recurring_template) {
    throw new Error("Task is not a recurring template");
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(input)
    .eq("id", id)
    .select(TASK_WITH_RELATIONS)
    .single();

  if (error) throw error;

  return data as TaskWithProject;
}
