import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createReimbursementAllocationSchema, validateIdParam } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("paymentId");
  const requestId = searchParams.get("requestId");

  let query = supabase
    .from("reimbursement_payment_allocations")
    .select("*")
    .order("created_at", { ascending: false });

  if (paymentId) {
    query = query.eq("payment_id", paymentId);
  }
  if (requestId) {
    query = query.eq("reimbursement_request_id", requestId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  // body can be a single allocation or array of allocations
  const rawAllocations = Array.isArray(body) ? body : [body];

  const validatedAllocations = [];
  for (const alloc of rawAllocations) {
    const parsed = createReimbursementAllocationSchema.safeParse(alloc);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    // Map schema field names to DB column names
    validatedAllocations.push({
      payment_id: parsed.data.payment_id,
      reimbursement_request_id: parsed.data.request_id,
      amount: parsed.data.amount,
    });
  }

  const allocations = validatedAllocations;

  const { data, error } = await supabase
    .from("reimbursement_payment_allocations")
    .insert(allocations)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check if any allocated requests are now fully paid
  for (const alloc of allocations) {
    const { data: allocsForRequest } = await supabase
      .from("reimbursement_payment_allocations")
      .select("amount")
      .eq("reimbursement_request_id", alloc.reimbursement_request_id);

    const { data: req } = await supabase
      .from("reimbursement_requests")
      .select("total_amount, status")
      .eq("id", alloc.reimbursement_request_id)
      .single();

    if (req && allocsForRequest) {
      const totalPaid = allocsForRequest.reduce(
        (sum, a) => sum + Number(a.amount),
        0
      );
      if (totalPaid >= Number(req.total_amount) && req.status !== "paid") {
        await supabase
          .from("reimbursement_requests")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", alloc.reimbursement_request_id);
      }
    }
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!validateIdParam(id)) {
    return NextResponse.json({ error: "Valid id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reimbursement_payment_allocations")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
