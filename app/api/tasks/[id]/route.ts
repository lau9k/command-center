import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateTaskSchema } from "@/lib/validations";
import { generateNextOccurrence } from "@/lib/recurring-tasks";
import { syncToPersonize } from "@/lib/personize/sync";

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
    .select("*, projects(id, name, color), contacts(name, email, company, linkedin_url)")
    .single();

  if (error) {
    console.error(`[API] PUT /api/tasks/${id} error:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync to Personize when meaningful fields changed — don't block the response.
  // Email resolution: use the linked contact's email if available (via contact_id join),
  // otherwise no email is passed (Personize will store without contact association).
  const syncFields = ["title", "description", "status", "priority"] as const;
  const hasMeaningfulChange = syncFields.some((f) => f in parsed.data);
  if (hasMeaningfulChange) {
    const contactEmail = (data.contacts as { email?: string } | null)?.email ?? undefined;
    syncToPersonize({
      table: "tasks",
      recordId: data.id,
      content: JSON.stringify({
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date,
        project_id: data.project_id,
      }),
      email: contactEmail,
    }).catch((err) => {
      console.error(`[API] PUT /api/tasks/${id} sync error:`, err);
    });
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
