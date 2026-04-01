"use server";

import { revalidatePath } from "next/cache";
import {
  createTask,
  updateTask,
  deleteTask as deleteTaskDb,
  bulkUpdateTasks as bulkUpdateTasksDb,
  bulkDeleteTasks as bulkDeleteTasksDb,
  batchUpdateOutreachStatus as batchUpdateOutreachStatusDb,
  deleteRecurringTask as deleteRecurringTaskDb,
  updateRecurringTask as updateRecurringTaskDb,
} from "@/lib/api/tasks";
import type {
  CreateTaskInput,
  UpdateTaskInput,
  BulkUpdateInput,
} from "@/lib/api/tasks";
import type { TaskWithProject, TaskOutreachStatus } from "@/lib/types/database";
import { createTaskSchema, updateTaskSchema } from "@/lib/validations";
import { syncToPersonize } from "@/lib/personize/sync";

// ── Result types ──────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────

function revalidateTaskPaths() {
  revalidatePath("/tasks");
  revalidatePath("/");
}

function buildSyncContent(task: TaskWithProject): string {
  return JSON.stringify({
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    due_date: task.due_date,
    project_id: task.project_id,
  });
}

function fireAndForgetSync(task: TaskWithProject) {
  const contactEmail =
    (task.contacts as { email?: string } | null)?.email ?? undefined;
  syncToPersonize({
    table: "tasks",
    recordId: task.id,
    content: buildSyncContent(task),
    email: contactEmail,
  }).catch((err) => {
    console.error("[Actions] task sync error:", err);
  });
}

// ── Create ────────────────────────────────────────────────

export async function createTaskAction(
  formData: FormData | CreateTaskInput
): Promise<ActionResult<TaskWithProject>> {
  try {
    const raw =
      formData instanceof FormData
        ? Object.fromEntries(formData.entries())
        : formData;

    const parsed = createTaskSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
    }

    const task = await createTask(parsed.data as CreateTaskInput);

    revalidateTaskPaths();
    fireAndForgetSync(task);

    return { success: true, data: task };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create task";
    console.error("[Actions] createTaskAction error:", err);
    return { success: false, error: message };
  }
}

// ── Update ────────────────────────────────────────────────

export async function updateTaskAction(
  id: string,
  data: UpdateTaskInput
): Promise<ActionResult<TaskWithProject>> {
  try {
    const parsed = updateTaskSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
    }

    const task = await updateTask(id, parsed.data as UpdateTaskInput);

    revalidateTaskPaths();
    fireAndForgetSync(task);

    return { success: true, data: task };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update task";
    console.error("[Actions] updateTaskAction error:", err);
    return { success: false, error: message };
  }
}

// ── Delete ────────────────────────────────────────────────

export async function deleteTaskAction(
  id: string
): Promise<ActionResult> {
  try {
    await deleteTaskDb(id);

    revalidateTaskPaths();

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete task";
    console.error("[Actions] deleteTaskAction error:", err);
    return { success: false, error: message };
  }
}

// ── Toggle Status ─────────────────────────────────────────

export async function toggleTaskStatusAction(
  id: string,
  status: string
): Promise<ActionResult<TaskWithProject>> {
  try {
    const parsed = updateTaskSchema.safeParse({ status });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid status" };
    }

    const task = await updateTask(id, parsed.data as UpdateTaskInput);

    revalidateTaskPaths();
    fireAndForgetSync(task);

    return { success: true, data: task };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to toggle task status";
    console.error("[Actions] toggleTaskStatusAction error:", err);
    return { success: false, error: message };
  }
}

// ── Bulk mutations ────────────────────────────────────────

export async function bulkUpdateTasks(
  ids: string[],
  updates: BulkUpdateInput
): Promise<ActionResult<TaskWithProject[]>> {
  try {
    const data = await bulkUpdateTasksDb(ids, updates);

    revalidateTaskPaths();

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to bulk update tasks";
    console.error("[Actions] bulkUpdateTasks error:", err);
    return { success: false, error: message };
  }
}

export async function bulkDeleteTasks(
  ids: string[]
): Promise<ActionResult<number>> {
  try {
    const count = await bulkDeleteTasksDb(ids);

    revalidateTaskPaths();

    return { success: true, data: count };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to bulk delete tasks";
    console.error("[Actions] bulkDeleteTasks error:", err);
    return { success: false, error: message };
  }
}

// ── Outreach batch ────────────────────────────────────────

export async function batchUpdateOutreachStatus(
  taskIds: string[],
  outreachStatus: TaskOutreachStatus,
  sentAt?: string | null
): Promise<ActionResult<TaskWithProject[]>> {
  try {
    const data = await batchUpdateOutreachStatusDb(taskIds, outreachStatus, sentAt);

    revalidateTaskPaths();

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update outreach status";
    console.error("[Actions] batchUpdateOutreachStatus error:", err);
    return { success: false, error: message };
  }
}

// ── Recurring tasks ───────────────────────────────────────

export async function createRecurringTask(
  input: CreateTaskInput
): Promise<ActionResult<TaskWithProject>> {
  return createTaskAction({ ...input, is_recurring_template: true });
}

export async function updateRecurringTask(
  id: string,
  input: UpdateTaskInput
): Promise<ActionResult<TaskWithProject>> {
  try {
    const parsed = updateTaskSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
    }

    const task = await updateRecurringTaskDb(id, parsed.data as UpdateTaskInput);

    revalidateTaskPaths();
    fireAndForgetSync(task);

    return { success: true, data: task };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update recurring task";
    console.error("[Actions] updateRecurringTask error:", err);
    return { success: false, error: message };
  }
}

export async function deleteRecurringTask(
  id: string
): Promise<ActionResult> {
  try {
    await deleteRecurringTaskDb(id);

    revalidateTaskPaths();

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete recurring task";
    console.error("[Actions] deleteRecurringTask error:", err);
    return { success: false, error: message };
  }
}

// ── Convenience aliases (backward compat) ─────────────────

export async function markTaskDone(
  id: string
): Promise<ActionResult<TaskWithProject>> {
  return toggleTaskStatusAction(id, "done");
}

export async function updateTaskTitle(
  id: string,
  title: string
): Promise<ActionResult<TaskWithProject>> {
  return updateTaskAction(id, { title });
}

export async function updateTaskStatus(
  id: string,
  status: string
): Promise<ActionResult<TaskWithProject>> {
  return toggleTaskStatusAction(id, status);
}

export async function updateTaskFields(
  id: string,
  fields: UpdateTaskInput
): Promise<ActionResult<TaskWithProject>> {
  return updateTaskAction(id, fields);
}

export async function deleteTask(
  id: string
): Promise<ActionResult> {
  return deleteTaskAction(id);
}
