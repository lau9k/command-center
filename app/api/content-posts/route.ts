import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createContentPostSchema, updateContentPostSchema, validateIdParam } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { syncToPersonize } from "@/lib/personize/sync";

export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}));

export const POST = withErrorHandler(withAuth(async function POST(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createContentPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("content_posts")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync to Personize in the background — don't block the response
  syncToPersonize({
    table: "content_posts",
    recordId: data.id,
    content: JSON.stringify(data),
  }).catch((err) => {
    console.error("[API] POST /api/content-posts sync error:", err);
  });

  return NextResponse.json(data, { status: 201 });
}));

export const PATCH = withErrorHandler(withAuth(async function PATCH(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateContentPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;

  const { data, error } = await supabase
    .from("content_posts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync to Personize in the background — don't block the response
  syncToPersonize({
    table: "content_posts",
    recordId: data.id,
    content: JSON.stringify(data),
  }).catch((err) => {
    console.error("[API] PATCH /api/content-posts sync error:", err);
  });

  return NextResponse.json(data);
}));

export const DELETE = withErrorHandler(withAuth(async function DELETE(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!validateIdParam(id)) {
    return NextResponse.json({ error: "Valid id is required" }, { status: 400 });
  }

  const { error } = await supabase.from("content_posts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}));
