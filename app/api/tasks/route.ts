import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const project = searchParams.get("project");
  const priority = searchParams.get("priority");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  let query = supabase
    .from("tasks")
    .select("*, projects(id, name, color)")
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

  const { data, error } = await query;

  if (error) {
    console.error("[API] GET /api/tasks error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("tasks")
    .insert(body)
    .select("*, projects(id, name, color)")
    .single();

  if (error) {
    console.error("[API] POST /api/tasks error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
