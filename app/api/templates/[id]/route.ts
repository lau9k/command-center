import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateEmailTemplateSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

function detectVariables(subject: string, body: string): string[] {
  const combined = `${subject} ${body}`;
  const variableMatches = combined.match(/\{\{(\w+)\}\}/g);
  return variableMatches
    ? [...new Set(variableMatches.map((m: string) => m.replace(/\{\{|\}\}/g, "")))]
    : [];
}

async function resolveVariables(
  supabase: ReturnType<typeof createServiceClient>,
  id: string,
  parsed: { subject?: string; body?: string }
) {
  if (parsed.subject === undefined && parsed.body === undefined) return {};

  const { data: current } = await supabase
    .from("email_templates")
    .select("subject, body")
    .eq("id", id)
    .single();

  const subject = parsed.subject ?? current?.subject ?? "";
  const templateBody = parsed.body ?? current?.body ?? "";
  return { variables: detectVariables(subject, templateBody) };
}

export const GET = withErrorHandler(withAuth(async function GET(
  _request: NextRequest,
  _user,
  context?: { params: Promise<Record<string, string>> },
) {
  const { id } = (await context?.params) ?? {};
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

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
}));

export const PUT = withErrorHandler(withAuth(async function PUT(
  request: NextRequest,
  _user,
  context?: { params: Promise<Record<string, string>> },
) {
  const { id } = (await context?.params) ?? {};
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateEmailTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const variableData = await resolveVariables(supabase, id, parsed.data);

  const { data, error } = await supabase
    .from("email_templates")
    .update({ ...parsed.data, ...variableData })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}));

export const PATCH = withErrorHandler(withAuth(async function PATCH(
  request: NextRequest,
  _user,
  context?: { params: Promise<Record<string, string>> },
) {
  const { id } = (await context?.params) ?? {};
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateEmailTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const variableData = await resolveVariables(supabase, id, parsed.data);

  const { data, error } = await supabase
    .from("email_templates")
    .update({ ...parsed.data, ...variableData })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}));

export const DELETE = withErrorHandler(withAuth(async function DELETE(
  _request: NextRequest,
  _user,
  context?: { params: Promise<Record<string, string>> },
) {
  const { id } = (await context?.params) ?? {};
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("email_templates").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}));
