import { NextRequest, NextResponse } from "next/server";
import { updateTaskSchema } from "@/lib/validations";
import { generateNextOccurrence } from "@/lib/recurring-tasks";
import { getTaskById, updateTask, deleteTask, createTask } from "@/lib/api/tasks";
import type { CreateTaskInput } from "@/lib/api/tasks";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await getTaskById(id);

    if (!data) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: string }).message ?? "Internal server error");
    console.error(`[API] GET /api/tasks/${id} error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const data = await updateTask(id, parsed.data);

    // Auto-generate next occurrence when a recurring task is completed
    let nextOccurrence = null;
    if (parsed.data.status === "done" && data.recurrence_rule) {
      try {
        // data contains user_id at runtime from the DB row, but TaskWithProject type omits it
        const nextTask = generateNextOccurrence(
          data as unknown as Parameters<typeof generateNextOccurrence>[0]
        );
        nextOccurrence = await createTask(nextTask as unknown as CreateTaskInput);
      } catch {
        // Non-blocking: if next occurrence fails, the completion still succeeds
      }
    }

    return NextResponse.json({ data, nextOccurrence });
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: string }).message ?? "Internal server error");
    console.error(`[API] PUT /api/tasks/${id} error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export { PUT as PATCH };

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: string }).message ?? "Internal server error");
    console.error(`[API] DELETE /api/tasks/${id} error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
