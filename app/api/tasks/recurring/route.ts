import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { generateNextOccurrence } from "@/lib/recurring-tasks";

const createRecurringSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  recurrence_rule: z.enum(["daily", "weekly", "weekdays", "monthly"]),
  project_id: z.string().uuid().optional().nullable(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
  is_recurring_template: z.boolean().optional(),
});

const generateSchema = z.object({
  template_id: z.string().uuid(),
});

/** GET /api/tasks/recurring — list all recurring task templates */
export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*, projects(id, name, color)")
    .eq("is_recurring_template", true)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}));

/** POST /api/tasks/recurring — create a new recurring template or generate next occurrence */
export const POST = withErrorHandler(withAuth(async function POST(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  // If body has template_id, generate next occurrence (backwards compat)
  const genParsed = generateSchema.safeParse(body);
  if (genParsed.success) {
    const { template_id } = genParsed.data;

    const { data: template, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", template_id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json(
        { error: "Template task not found" },
        { status: 404 }
      );
    }

    if (!template.recurrence_rule) {
      return NextResponse.json(
        { error: "Task has no recurrence rule" },
        { status: 400 }
      );
    }

    const nextTask = generateNextOccurrence(template);

    const { data, error } = await supabase
      .from("tasks")
      .insert(nextTask)
      .select("*, projects(id, name, color)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  }

  // Otherwise, create a new recurring template
  const parsed = createRecurringSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const insertData = {
    ...parsed.data,
    is_recurring_template: true,
    status: parsed.data.status ?? "todo",
  };

  const { data, error } = await supabase
    .from("tasks")
    .insert(insertData)
    .select("*, projects(id, name, color)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}));
