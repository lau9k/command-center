"use server";

import {
  updateTask,
  deleteTask as deleteTaskById,
  createTask,
  bulkUpdateTasks as bulkUpdateTasksApi,
  bulkDeleteTasks as bulkDeleteTasksApi,
  batchUpdateOutreachStatus as batchUpdateOutreachStatusApi,
  deleteRecurringTask as deleteRecurringTaskApi,
  updateRecurringTask as updateRecurringTaskApi,
} from "@/lib/api/tasks";
import type { UpdateTaskInput, CreateTaskInput, BulkUpdateInput } from "@/lib/api/tasks";
import type { TaskWithProject, TaskStatus, TaskOutreachStatus } from "@/lib/types/database";

// ── Single-task mutations ────────────────────────────────

export async function markTaskDone(id: string): Promise<TaskWithProject> {
  return updateTask(id, { status: "done" });
}

export async function updateTaskTitle(
  id: string,
  title: string
): Promise<TaskWithProject> {
  return updateTask(id, { title });
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<TaskWithProject> {
  return updateTask(id, { status });
}

export async function updateTaskFields(
  id: string,
  fields: UpdateTaskInput
): Promise<TaskWithProject> {
  return updateTask(id, fields);
}

export async function deleteTask(id: string): Promise<void> {
  return deleteTaskById(id);
}

// ── Bulk mutations ───────────────────────────────────────

export async function bulkUpdateTasks(
  ids: string[],
  updates: BulkUpdateInput
): Promise<TaskWithProject[]> {
  return bulkUpdateTasksApi(ids, updates);
}

export async function bulkDeleteTasks(ids: string[]): Promise<number> {
  return bulkDeleteTasksApi(ids);
}

// ── Outreach batch ───────────────────────────────────────

export async function batchUpdateOutreachStatus(
  taskIds: string[],
  outreachStatus: TaskOutreachStatus,
  sentAt?: string | null
): Promise<TaskWithProject[]> {
  return batchUpdateOutreachStatusApi(taskIds, outreachStatus, sentAt);
}

// ── Recurring tasks ──────────────────────────────────────

export async function createRecurringTask(
  input: CreateTaskInput
): Promise<TaskWithProject> {
  return createTask({ ...input, is_recurring_template: true });
}

export async function updateRecurringTask(
  id: string,
  input: UpdateTaskInput
): Promise<TaskWithProject> {
  return updateRecurringTaskApi(id, input);
}

export async function deleteRecurringTask(id: string): Promise<void> {
  return deleteRecurringTaskApi(id);
}
