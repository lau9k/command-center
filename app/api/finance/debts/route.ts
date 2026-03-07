import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Debt, DebtWithProjections, DebtPayoffProjection } from "@/lib/types/database";

function calculatePayoffProjection(debt: Debt): DebtPayoffProjection {
  const balance = Number(debt.balance);
  const rate = Number(debt.interest_rate ?? 0) / 100;
  const minPayment = Number(debt.min_payment ?? 0);
  const monthlyRate = rate / 12;
  const monthlyInterestCost = balance * monthlyRate;

  // No interest or no payment → special cases
  if (rate === 0) {
    if (minPayment <= 0) {
      return {
        monthsToPayoff: null,
        projectedPayoffDate: null,
        totalInterestCost: 0,
        monthlyInterestCost: 0,
      };
    }
    const months = Math.ceil(balance / minPayment);
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);
    return {
      monthsToPayoff: months,
      projectedPayoffDate: payoffDate.toISOString().split("T")[0],
      totalInterestCost: 0,
      monthlyInterestCost: 0,
    };
  }

  if (minPayment <= monthlyInterestCost) {
    // Payment doesn't cover interest — never pays off
    return {
      monthsToPayoff: null,
      projectedPayoffDate: null,
      totalInterestCost: monthlyInterestCost * 12, // annual estimate
      monthlyInterestCost,
    };
  }

  // Standard amortization formula: n = -ln(1 - r*PV/PMT) / ln(1+r)
  const months = Math.ceil(
    -Math.log(1 - (monthlyRate * balance) / minPayment) /
      Math.log(1 + monthlyRate)
  );

  const totalPaid = minPayment * months;
  const totalInterestCost = totalPaid - balance;

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);

  return {
    monthsToPayoff: months,
    projectedPayoffDate: payoffDate.toISOString().split("T")[0],
    totalInterestCost,
    monthlyInterestCost,
  };
}

function enrichDebt(debt: Debt): DebtWithProjections {
  const principal = Number(debt.principal);
  const balance = Number(debt.balance);
  const utilization = principal > 0 ? balance / principal : 0;

  let nextDueDate: string | null = null;
  if (debt.due_day) {
    const now = new Date();
    const dueThisMonth = new Date(now.getFullYear(), now.getMonth(), debt.due_day);
    if (dueThisMonth <= now) {
      dueThisMonth.setMonth(dueThisMonth.getMonth() + 1);
    }
    nextDueDate = dueThisMonth.toISOString().split("T")[0];
  }

  return {
    ...debt,
    utilization,
    nextDueDate,
    projection: calculatePayoffProjection(debt),
  };
}

export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const withProjections = searchParams.get("projections") !== "false";

  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .order("balance", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (withProjections) {
    const enriched: DebtWithProjections[] = (data as Debt[]).map(enrichDebt);
    return NextResponse.json(enriched);
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("debts")
    .insert(body)
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
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("debts")
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

  const { error } = await supabase.from("debts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
