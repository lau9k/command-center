import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

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
