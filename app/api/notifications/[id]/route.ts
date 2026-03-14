import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { uuidParam } from "@/lib/validations";

export const PUT = withErrorHandler(async function PUT(
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  if (!id || !uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const body = await request.json();

  const read = body.read;
  if (typeof read !== "boolean") {
    return NextResponse.json({ error: "Body must include { read: boolean }" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .update({ read })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});

export const PATCH = withErrorHandler(async function PATCH(
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  if (!id || !uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const body = await request.json();

  const updates: Record<string, boolean> = {};

  if (typeof body.read === "boolean") {
    updates.read = body.read;
  }

  if (typeof body.archived === "boolean" && body.archived) {
    const { error: delError } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, archived: true });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Body must include { read: boolean } or { archived: boolean }" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("notifications")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});

export const DELETE = withErrorHandler(async function DELETE(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  if (!id || !uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("notifications").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
