import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createSponsorSchema, updateSponsorSchema, validateIdParam } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withErrorHandler(withAuth(async function GET(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status");
  const tier = searchParams.get("tier");
  const search = searchParams.get("q") ?? searchParams.get("search");
  const eventId = searchParams.get("event_id");

  let query = supabase
    .from("sponsors")
    .select("*")
    .order("updated_at", { ascending: false });

  if (eventId) {
    query = query.eq("event_id", eventId);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (tier) {
    query = query.eq("tier", tier);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,contact_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}));

export const POST = withErrorHandler(withAuth(async function POST(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createSponsorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("sponsors")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}));

export const PATCH = withErrorHandler(withAuth(async function PATCH(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateSponsorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { id, ...updates } = parsed.data;

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
}));

export const DELETE = withErrorHandler(withAuth(async function DELETE(request: NextRequest, _user) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!validateIdParam(id)) {
    return NextResponse.json({ error: "Missing or invalid id parameter" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("sponsors").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}));
