import { createServiceClient } from "@/lib/supabase/service";
import { DebtsDashboard } from "@/components/finance/DebtsDashboard";
import type { Debt, DebtWithProjections, DebtPayoffProjection } from "@/lib/types/database";

function calculatePayoffProjection(debt: Debt): DebtPayoffProjection {
  const balance = Number(debt.balance);
  const rate = Number(debt.interest_rate ?? 0) / 100;
  const minPayment = Number(debt.min_payment ?? 0);
  const monthlyRate = rate / 12;
  const monthlyInterestCost = balance * monthlyRate;

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
    return {
      monthsToPayoff: null,
      projectedPayoffDate: null,
      totalInterestCost: monthlyInterestCost * 12,
      monthlyInterestCost,
    };
  }

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

export default async function DebtsPage() {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("debts")
    .select("*")
    .order("balance", { ascending: false });

  const debts: DebtWithProjections[] = ((data as Debt[]) ?? []).map(enrichDebt);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Debts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track balances, interest costs, and projected payoff dates
        </p>
      </div>

      <DebtsDashboard debts={debts} />
    </div>
  );
}
