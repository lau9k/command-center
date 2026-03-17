import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { validateApiKey } from "@/lib/api-auth";
import { withErrorHandler } from "@/lib/api-error-handler";

const MAX_TASKS = 200;

const bulkTaskInputSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  task_type: z.string().max(200).optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  external_url: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(100)).optional().nullable(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  due_date: z.string().datetime().optional().nullable(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
  context: z.string().max(10000).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

const bulkTasksRequestSchema = z.object({
  tasks: z
    .array(bulkTaskInputSchema)
    .min(1, "At least one task is required")
    .max(MAX_TASKS, `Maximum ${MAX_TASKS} tasks per request`),
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized — missing or invalid API key" },
      { status: 401 },
    );
  }

  const body: unknown = await request.json();

  const parsed = bulkTasksRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const validTasks: z.infer<typeof bulkTaskInputSchema>[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < parsed.data.tasks.length; i++) {
    const taskResult = bulkTaskInputSchema.safeParse(parsed.data.tasks[i]);
    if (taskResult.success) {
      validTasks.push(taskResult.data);
    } else {
      const fieldErrors = taskResult.error.flatten().fieldErrors;
      errors.push({
        index: i,
        error: Object.entries(fieldErrors)
          .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(", ")}`)
          .join("; "),
      });
    }
  }

  let created = 0;

  if (validTasks.length > 0) {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("tasks")
      .insert(validTasks)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    created = data?.length ?? 0;
  }

  return NextResponse.json({ created, errors }, { status: 201 });
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one task ID is required"),
  updates: z.object({
    status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  }).refine((u) => u.status !== undefined || u.priority !== undefined, {
    message: "At least one field to update is required",
  }),
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one task ID is required"),
});

export const PUT = withErrorHandler(async function PUT(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { ids, updates } = parsed.data;

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .in("id", ids)
    .select("*, projects(id, name, color)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, updated: data?.length ?? 0 });
});

export const DELETE = withErrorHandler(async function DELETE(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = bulkDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { ids } = parsed.data;

  const { error } = await supabase
    .from("tasks")
    .delete()
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length });
});
