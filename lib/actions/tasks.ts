"use server";

import {
  updateTask,
  deleteTask as deleteTaskById,
} from "@/lib/api/tasks";
import type { TaskWithProject } from "@/lib/types/database";

export async function markTaskDone(id: string): Promise<TaskWithProject> {
  return updateTask(id, { status: "done" });
}

export async function updateTaskTitle(
  id: string,
  title: string
): Promise<TaskWithProject> {
  return updateTask(id, { title });
}

export async function deleteTask(id: string): Promise<void> {
  return deleteTaskById(id);
}
