import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { validateIdParam } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";

const createOutreachSchema = z.object({
  type: z.enum(["email", "call", "meeting", "linkedin", "other"]),
  subject: z.string().max(500).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  status: z.enum(["sent", "replied", "no_response", "follow_up_needed"]).optional(),
  contacted_at: z.string().datetime().optional().nullable(),
});

export const GET = withErrorHandler(async function GET(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) {
  const { id } = (await context?.params) ?? {};

  if (!validateIdParam(id ?? null)) {
    return NextResponse.json({ error: "Missing or invalid sponsor id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("sponsor_outreach")
    .select("*")
    .eq("sponsor_id", id)
    .order("contacted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});

export const POST = withErrorHandler(async function POST(
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) {
  const { id } = (await context?.params) ?? {};

  if (!validateIdParam(id ?? null)) {
    return NextResponse.json({ error: "Missing or invalid sponsor id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = createOutreachSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("sponsor_outreach")
    .insert({ sponsor_id: id, ...parsed.data })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
});
