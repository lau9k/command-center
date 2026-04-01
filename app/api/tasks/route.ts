import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createTaskSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { syncToPersonize } from "@/lib/personize/sync";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const project = searchParams.get("project");
  const priority = searchParams.get("priority");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const type = searchParams.get("type");
  const contactId = searchParams.get("contact_id");

  let query = supabase
    .from("tasks")
    .select("*, projects(id, name, color), contacts(name, email, company, linkedin_url)")
    .order("priority", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });

  if (project) {
    query = query.eq("project_id", project);
  }

  if (priority) {
    query = query.eq("priority", priority);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (type) {
    query = query.eq("task_type", type);
  }

  if (contactId) {
    query = query.eq("contact_id", contactId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert(parsed.data)
    .select("*, projects(id, name, color), contacts(name, email, company, linkedin_url)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync to Personize in the background — don't block the response.
  // Email resolution: use the linked contact's email if available (via contact_id join),
  // otherwise no email is passed (Personize will store without contact association).
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
    console.error("[API] POST /api/tasks sync error:", err);
  });

  return NextResponse.json({ data }, { status: 201 });
});
