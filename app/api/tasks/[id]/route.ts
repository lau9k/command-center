import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateTaskSchema } from "@/lib/validations";
import { generateNextOccurrence } from "@/lib/recurring-tasks";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*, projects(id, name, color)")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`[API] GET /api/tasks/${id} error:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(parsed.data)
    .eq("id", id)
    .select("*, projects(id, name, color)")
    .single();

  if (error) {
    console.error(`[API] PUT /api/tasks/${id} error:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-generate next occurrence when a recurring task is completed
  let nextOccurrence = null;
  if (parsed.data.status === "done" && data.recurrence_rule) {
    try {
      const nextTask = generateNextOccurrence(data);
      const { data: created } = await supabase
        .from("tasks")
        .insert(nextTask)
        .select("*, projects(id, name, color)")
        .single();
      nextOccurrence = created;
    } catch {
      // Non-blocking: if next occurrence fails, the completion still succeeds
    }
  }

  return NextResponse.json({ data, nextOccurrence });
}

export { PUT as PATCH };

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    console.error(`[API] DELETE /api/tasks/${id} error:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
