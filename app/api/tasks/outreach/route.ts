import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const outreachStatus = searchParams.get("outreach_status");
  const search = searchParams.get("search");

  // Check if outreach_status column exists by attempting a filtered query
  // Fall back to task_type-only filter if the column hasn't been migrated yet
  let hasOutreachStatus = true;
  let query = supabase
    .from("tasks")
    .select(
      "*, projects(id, name, color), contacts!tasks_contact_id_fkey(name, email, company, linkedin_url)"
    );

  // Try with outreach_status first; if column doesn't exist, retry without it
  if (outreachStatus) {
    query = query
      .or("task_type.eq.outreach,tags.cs.{outreach}")
      .eq("outreach_status", outreachStatus);
  } else {
    query = query.or("task_type.eq.outreach,tags.cs.{outreach}");
  }

  query = query
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  let { data, error } = await query;

  // If outreach_status column doesn't exist, retry without it
  if (error?.message?.includes("outreach_status")) {
    hasOutreachStatus = false;
    let retryQuery = supabase
      .from("tasks")
      .select(
        "*, projects(id, name, color), contacts!tasks_contact_id_fkey(name, email, company, linkedin_url)"
      )
      .or("task_type.eq.outreach,tags.cs.{outreach}")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    if (search) {
      retryQuery = retryQuery.ilike("title", `%${search}%`);
    }

    const retryResult = await retryQuery;
    data = retryResult.data;
    error = retryResult.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, _meta: { hasOutreachStatus } });
});
