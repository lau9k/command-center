import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[API] GET /api/contacts/[id] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: error.code === "PGRST116" ? 404 : 500 });
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

  const { data, error } = await supabase
    .from("contacts")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[API] PUT /api/contacts/[id] error:", error.message);
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

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[API] DELETE /api/contacts/[id] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
