import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { generateNextOccurrence } from "@/lib/recurring-tasks";

const generateSchema = z.object({
  template_id: z.string().uuid(),
});

/** POST /api/tasks/recurring — generate next occurrence from a recurring template */
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { template_id } = parsed.data;

  // Fetch the template task
  const { data: template, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", template_id)
    .single();

  if (fetchError || !template) {
    return NextResponse.json({ error: "Template task not found" }, { status: 404 });
  }

  if (!template.recurrence_rule) {
    return NextResponse.json({ error: "Task has no recurrence rule" }, { status: 400 });
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
