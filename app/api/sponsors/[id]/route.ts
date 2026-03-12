import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateSponsorSchema, validateIdParam } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";

export const GET = withErrorHandler(async function GET(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) {
  const { id } = (await context?.params) ?? {};

  if (!validateIdParam(id ?? null)) {
    return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const [{ data: sponsor, error: sponsorError }, { data: outreach, error: outreachError }] =
    await Promise.all([
      supabase.from("sponsors").select("*").eq("id", id).single(),
      supabase
        .from("sponsor_outreach")
        .select("*")
        .eq("sponsor_id", id)
        .order("contacted_at", { ascending: false }),
    ]);

  if (sponsorError) {
    const status = sponsorError.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: sponsorError.message }, { status });
  }

  if (outreachError) {
    return NextResponse.json({ error: outreachError.message }, { status: 500 });
  }

  return NextResponse.json({ data: { ...sponsor, outreach: outreach ?? [] } });
});

export const PUT = withErrorHandler(async function PUT(
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) {
  const { id } = (await context?.params) ?? {};

  if (!validateIdParam(id ?? null)) {
    return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = updateSponsorSchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { id: _id, ...updates } = parsed.data;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("sponsors")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});

export const DELETE = withErrorHandler(async function DELETE(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) {
  const { id } = (await context?.params) ?? {};

  if (!validateIdParam(id ?? null)) {
    return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("sponsors").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
