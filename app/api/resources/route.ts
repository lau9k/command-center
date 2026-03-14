import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createResourceSchema } from "@/lib/types/resources";
import { withErrorHandler } from "@/lib/api-error-handler";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const search = searchParams.get("q") ?? searchParams.get("search");
  const fileType = searchParams.get("file_type");
  const projectId = searchParams.get("project_id");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") ?? "newest";

  const supabase = createServiceClient();

  let query = supabase
    .from("resources")
    .select("*")
    .eq("status", status ?? "active");

  if (fileType && fileType !== "all") {
    query = query.eq("file_type", fileType);
  }
  if (projectId && projectId !== "all") {
    query = query.eq("project_id", projectId);
  }
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,description.ilike.%${search}%`
    );
  }

  switch (sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "name":
      query = query.order("title", { ascending: true });
      break;
    case "type":
      query = query.order("file_type", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
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

  const parsed = createResourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("resources")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
});
