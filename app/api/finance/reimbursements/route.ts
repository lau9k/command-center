import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const withItems = searchParams.get("withItems") === "true";

  if (withItems) {
    const { data: requests, error } = await supabase
      .from("reimbursement_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: items, error: itemsError } = await supabase
      .from("reimbursement_items")
      .select("*")
      .order("expense_date", { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const requestsWithItems = (requests ?? []).map((r) => ({
      ...r,
      items: (items ?? []).filter(
        (i) => i.reimbursement_request_id === r.id
      ),
    }));

    return NextResponse.json(requestsWithItems);
  }

  const { data, error } = await supabase
    .from("reimbursement_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { items, ...requestData } = body;

  // Create the request
  const { data: req, error } = await supabase
    .from("reimbursement_requests")
    .insert(requestData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create line items if provided
  if (items && Array.isArray(items) && items.length > 0) {
    const itemsWithRequestId = items.map((item: Record<string, unknown>) => ({
      ...item,
      reimbursement_request_id: req.id,
      user_id: req.user_id,
    }));

    const { error: itemsError } = await supabase
      .from("reimbursement_items")
      .insert(itemsWithRequestId);

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
  }

  return NextResponse.json(req, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  // Auto-set timestamp fields based on status transitions
  if (updates.status === "submitted" && !updates.submitted_at) {
    updates.submitted_at = new Date().toISOString();
  }
  if (updates.status === "approved" && !updates.approved_at) {
    updates.approved_at = new Date().toISOString();
  }
  if (updates.status === "paid" && !updates.paid_at) {
    updates.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("reimbursement_requests")
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

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reimbursement_requests")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
