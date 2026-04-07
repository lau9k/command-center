import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { z } from "zod";

const updateRecurringSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  recurrence_rule: z
    .enum(["daily", "weekly", "weekdays", "monthly"])
    .optional(),
  project_id: z.string().uuid().optional().nullable(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
  is_recurring_template: z.boolean().optional(),
});

/** PUT /api/tasks/recurring/:id — update a recurring template */
export const PUT = withErrorHandler(withAuth(async function PUT(
  request: NextRequest,
  _user,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateRecurringSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(parsed.data)
    .eq("id", id)
    .eq("is_recurring_template", true)
    .select("*, projects(id, name, color)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}));

/** DELETE /api/tasks/recurring/:id — delete a recurring template */
export const DELETE = withErrorHandler(withAuth(async function DELETE(
  _request: NextRequest,
  _user,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("is_recurring_template", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}));
