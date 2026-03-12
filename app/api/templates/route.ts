import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createEmailTemplateSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const category = searchParams.get("category");
  const search = searchParams.get("search");

  let query = supabase
    .from("email_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.ilike("name", `%${search}%`);
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

  const parsed = createEmailTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Auto-detect variables from subject and body
  const combined = `${parsed.data.subject ?? ""} ${parsed.data.body ?? ""}`;
  const variableMatches = combined.match(/\{\{(\w+)\}\}/g);
  const detectedVariables = variableMatches
    ? [...new Set(variableMatches.map((m) => m.replace(/\{\{|\}\}/g, "")))]
    : [];

  const { data, error } = await supabase
    .from("email_templates")
    .insert({ ...parsed.data, variables: detectedVariables })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
});
