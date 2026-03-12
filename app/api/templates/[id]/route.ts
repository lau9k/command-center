import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateEmailTemplateSchema } from "@/lib/validations";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
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

  const parsed = updateEmailTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Auto-detect variables from subject and body if either changed
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.subject !== undefined || parsed.data.body !== undefined) {
    // Fetch current template to merge subject/body for variable detection
    const { data: current } = await supabase
      .from("email_templates")
      .select("subject, body")
      .eq("id", id)
      .single();

    const subject = parsed.data.subject ?? current?.subject ?? "";
    const templateBody = parsed.data.body ?? current?.body ?? "";
    const combined = `${subject} ${templateBody}`;
    const variableMatches = combined.match(/\{\{(\w+)\}\}/g);
    updateData.variables = variableMatches
      ? [...new Set(variableMatches.map((m: string) => m.replace(/\{\{|\}\}/g, "")))]
      : [];
  }

  const { data, error } = await supabase
    .from("email_templates")
    .update(updateData)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase.from("email_templates").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
