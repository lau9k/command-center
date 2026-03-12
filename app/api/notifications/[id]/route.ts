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
