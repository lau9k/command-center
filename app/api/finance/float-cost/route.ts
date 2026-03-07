import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const APR = 0.2599;
const DAYS_PER_YEAR = 365;

export async function GET() {
  const supabase = createServiceClient();

  // Get all non-paid reimbursement requests
  const { data: requests, error: reqError } = await supabase
    .from("reimbursement_requests")
    .select("id, total_amount, status, created_at")
    .neq("status", "paid");

  if (reqError) {
    return NextResponse.json({ error: reqError.message }, { status: 500 });
  }

  // Get all allocations for these requests
  const requestIds = (requests ?? []).map((r) => r.id);
  let allocations: { reimbursement_request_id: string; amount: number }[] = [];

  if (requestIds.length > 0) {
    const { data: allocData, error: allocError } = await supabase
      .from("reimbursement_payment_allocations")
      .select("reimbursement_request_id, amount")
      .in("reimbursement_request_id", requestIds);

    if (allocError) {
      return NextResponse.json({ error: allocError.message }, { status: 500 });
    }
    allocations = allocData ?? [];
  }

  const now = new Date();
  let totalFloatCost = 0;
  let totalOutstanding = 0;
  let ytdFloatCost = 0;
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const details = (requests ?? []).map((r) => {
    const paidForRequest = allocations
      .filter((a) => a.reimbursement_request_id === r.id)
      .reduce((sum, a) => sum + Number(a.amount), 0);

    const outstanding = Number(r.total_amount) - paidForRequest;
    const createdAt = new Date(r.created_at);
    const daysOpen = Math.max(
      0,
      Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Float cost = outstanding * APR / 365 * days_open
    const floatCost = outstanding * APR / DAYS_PER_YEAR * daysOpen;

    totalFloatCost += floatCost;
    totalOutstanding += outstanding;

    // YTD: only count days within this year
    const effectiveStart = createdAt > yearStart ? createdAt : yearStart;
    const ytdDays = Math.max(
      0,
      Math.floor((now.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24))
    );
    const ytdCost = outstanding * APR / DAYS_PER_YEAR * ytdDays;
    ytdFloatCost += ytdCost;

    return {
      id: r.id,
      outstanding,
      days_open: daysOpen,
      float_cost: Math.round(floatCost * 100) / 100,
    };
  });

  // Monthly float cost estimate (based on current outstanding)
  const monthlyFloatCost = totalOutstanding * APR / 12;

  return NextResponse.json({
    total_outstanding: Math.round(totalOutstanding * 100) / 100,
    total_float_cost: Math.round(totalFloatCost * 100) / 100,
    monthly_float_cost: Math.round(monthlyFloatCost * 100) / 100,
    ytd_float_cost: Math.round(ytdFloatCost * 100) / 100,
    apr: APR,
    details,
  });
}
