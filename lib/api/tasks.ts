import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
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
  is_recurring_template?: boolean;
  contact_id?: string | null;
  task_type?: TaskType;
  external_url?: string | null;
  outreach_status?: TaskOutreachStatus;
  sent_at?: string | null;
  response_notes?: string | null;
  tags?: string[] | null;
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
