import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const outreachStatus = searchParams.get("outreach_status");
  const search = searchParams.get("search");

  let query = supabase
    .from("tasks")
    .select(
      "*, projects(id, name, color), contacts!tasks_contact_id_fkey(name, email, company, linkedin_url)"
    )
    .or(
      "task_type.eq.outreach,outreach_status.not.is.null,tags.cs.{outreach}"
    )
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (outreachStatus) {
    query = query.eq("outreach_status", outreachStatus);
  }

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});
