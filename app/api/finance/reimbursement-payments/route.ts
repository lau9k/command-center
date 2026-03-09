import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createReimbursementPaymentSchema, updateReimbursementPaymentSchema, validateIdParam } from "@/lib/validations";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reimbursement_payments")
    .select("*")
    .order("payment_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createReimbursementPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reimbursement_payments")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateReimbursementPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;

  const { data, error } = await supabase
    .from("reimbursement_payments")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!validateIdParam(id)) {
    return NextResponse.json({ error: "Valid id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reimbursement_payments")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
