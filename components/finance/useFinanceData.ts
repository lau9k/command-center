import { useMemo } from "react";
import {
  CATEGORY_COLORS,
  DEFAULT_COLOR,
  ESSENTIAL_CATEGORIES,
  getDaysUntilDue,
  getDueGroup,
  type WalletView,
  type FilterValues,
  type Transaction,
  type Debt,
  type BalanceSnapshot,
  type ReimbursementRequest,
} from "./types";

function normalizeToMonthly(amount: number, interval: string): number {
  if (interval === "biweekly") return amount * 2;
  if (interval === "weekly") return amount * 4;
  return amount;
}

export function useFinanceData(
  transactions: Transaction[],
  debts: Debt[],
  snapshots: BalanceSnapshot[],
  reimbursementRequests: ReimbursementRequest[],
  truePersonalSpend: boolean,
  walletView: WalletView,
  filterValues: FilterValues,
) {
  const effectiveTransactions = useMemo(() => {
    if (!truePersonalSpend) return transactions;
    return transactions.filter(
      (t) => !(t as Transaction & { is_reimbursable?: boolean }).is_reimbursable
    );
  }, [transactions, truePersonalSpend]);

  const latestSnapshot = snapshots[0] ?? null;

  const monthlyExpenses = useMemo(
    () =>
      effectiveTransactions
        .filter((t) => t.type === "expense" && t.interval !== "one_time")
        .reduce((sum, t) => sum + normalizeToMonthly(Number(t.amount), t.interval), 0),
    [effectiveTransactions]
  );

  const monthlyIncome = useMemo(
    () =>
      effectiveTransactions
        .filter((t) => t.type === "income" && t.interval !== "one_time")
        .reduce((sum, t) => sum + normalizeToMonthly(Number(t.amount), t.interval), 0),
    [effectiveTransactions]
  );

  const totalDebt = useMemo(
    () => debts.reduce((sum, d) => sum + Number(d.balance), 0),
    [debts]
  );

  const monthlySavings = monthlyIncome - monthlyExpenses;

  const monthlyEssentials = useMemo(
    () =>
      effectiveTransactions
        .filter(
          (t) =>
            t.type === "expense" &&
            t.interval !== "one_time" &&
            ESSENTIAL_CATEGORIES.has(t.category ?? "")
        )
        .reduce((sum, t) => sum + normalizeToMonthly(Number(t.amount), t.interval), 0),
    [effectiveTransactions]
  );

  const weeklyBudget = useMemo(() => {
    return Math.max(0, (monthlyIncome - monthlyEssentials) / 4.33);
  }, [monthlyIncome, monthlyEssentials]);

  const weeklySpent = useMemo(() => {
    return effectiveTransactions
      .filter(
        (t) =>
          t.type === "expense" &&
          t.interval !== "one_time" &&
          !ESSENTIAL_CATEGORIES.has(t.category ?? "")
      )
      .reduce((sum, t) => {
        const amt = Number(t.amount);
        if (t.interval === "monthly") return sum + amt / 4.33;
        if (t.interval === "biweekly") return sum + amt / 2.165;
        return sum + amt;
      }, 0);
  }, [effectiveTransactions]);

  // --- Upcoming Payments ---
  const upcomingPayments = useMemo(() => {
    return effectiveTransactions
      .filter((t) => t.type === "expense" && t.interval !== "one_time" && t.due_day != null)
      .map((t) => ({ ...t, daysUntil: getDaysUntilDue(t.due_day!) }))
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [effectiveTransactions]);

  const paymentGroups = useMemo(() => {
    const groups = new Map<string, typeof upcomingPayments>();
    const order = ["Overdue", "This Week", "Next 2 Weeks", "Rest of Month"];
    for (const p of upcomingPayments) {
      const group = getDueGroup(p.daysUntil);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(p);
    }
    return order
      .filter((g) => groups.has(g))
      .map((g) => ({ label: g, items: groups.get(g)! }));
  }, [upcomingPayments]);

  // --- Reimbursements ---
  const outstandingReimbursements = useMemo(
    () => reimbursementRequests.filter((r) => r.status === "submitted" || r.status === "approved"),
    [reimbursementRequests]
  );
  const receivedReimbursements = useMemo(
    () => reimbursementRequests.filter((r) => r.status === "paid"),
    [reimbursementRequests]
  );
  const totalOutstanding = useMemo(
    () => outstandingReimbursements.reduce((s, r) => s + Number(r.total_amount), 0),
    [outstandingReimbursements]
  );
  const totalReceived = useMemo(
    () => receivedReimbursements.reduce((s, r) => s + Number(r.total_amount), 0),
    [receivedReimbursements]
  );

  // --- Chart data ---
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    effectiveTransactions
      .filter((t) => t.type === "expense" && t.interval !== "one_time")
      .forEach((t) => {
        const cat = t.category ?? "other";
        map.set(cat, (map.get(cat) ?? 0) + Number(t.amount));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        value,
        fill: CATEGORY_COLORS[name] ?? DEFAULT_COLOR,
      }))
      .sort((a, b) => b.value - a.value);
  }, [effectiveTransactions]);

  const barData = useMemo(() => {
    return categoryBreakdown.slice(0, 6).map((c) => ({
      name: c.name.length > 12 ? c.name.slice(0, 10) + "\u2026" : c.name,
      amount: c.value,
      fill: c.fill,
    }));
  }, [categoryBreakdown]);

  const rollingBurnData = useMemo(() => {
    const monthlyExp = new Map<string, number>();
    const monthlyInc = new Map<string, number>();
    effectiveTransactions.forEach((t) => {
      const dateStr = t.start_date ?? t.created_at;
      const d = new Date(dateStr);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (t.type === "expense") {
        monthlyExp.set(monthKey, (monthlyExp.get(monthKey) ?? 0) + Number(t.amount));
      } else {
        monthlyInc.set(monthKey, (monthlyInc.get(monthKey) ?? 0) + Number(t.amount));
      }
    });
    const allMonths = new Set([...monthlyExp.keys(), ...monthlyInc.keys()]);
    const sortedMonths = Array.from(allMonths).sort();
    return sortedMonths.map((month, i) => {
      const expenses = monthlyExp.get(month) ?? 0;
      const income = monthlyInc.get(month) ?? 0;
      const windowStart = Math.max(0, i - 2);
      const windowSlice = sortedMonths.slice(windowStart, i + 1);
      const avg =
        windowSlice.reduce((s, m) => s + (monthlyExp.get(m) ?? 0), 0) / windowSlice.length;
      return { month, expenses, income, rollingAvg: Math.round(avg) };
    });
  }, [effectiveTransactions]);

  // --- Transaction grouping & filtering ---
  const groupedTransactions = useMemo(() => {
    if (walletView !== "overview") return effectiveTransactions;
    const splitGroups = new Map<string, Transaction[]>();
    const nonSplit: Transaction[] = [];
    effectiveTransactions.forEach((t) => {
      if (t.split_group_id) {
        const group = splitGroups.get(t.split_group_id) ?? [];
        group.push(t);
        splitGroups.set(t.split_group_id, group);
      } else {
        nonSplit.push(t);
      }
    });
    const splitRepresentatives: Transaction[] = [];
    splitGroups.forEach((members) => {
      const totalAmount = members.reduce((s, m) => s + Number(m.amount), 0);
      splitRepresentatives.push({
        ...members[0],
        amount: totalAmount,
        notes: `Split across ${members.length} wallets`,
      });
    });
    return [...nonSplit, ...splitRepresentatives];
  }, [effectiveTransactions, walletView]);

  const displayedTransactions = useMemo(() => {
    let filtered = groupedTransactions;
    if (walletView === "expenses") {
      filtered = effectiveTransactions.filter((t) => t.type === "expense");
    } else if (walletView === "income") {
      filtered = effectiveTransactions.filter((t) => t.type === "income");
    }
    if (filterValues.category.length > 0) {
      filtered = filtered.filter((t) => filterValues.category.includes(t.category ?? ""));
    }
    if (filterValues.interval.length > 0) {
      filtered = filtered.filter((t) => filterValues.interval.includes(t.interval));
    }
    return filtered;
  }, [effectiveTransactions, groupedTransactions, walletView, filterValues]);

  return {
    latestSnapshot,
    monthlyExpenses,
    monthlyIncome,
    totalDebt,
    monthlySavings,
    monthlyEssentials,
    weeklyBudget,
    weeklySpent,
    paymentGroups,
    outstandingReimbursements,
    receivedReimbursements,
    totalOutstanding,
    totalReceived,
    categoryBreakdown,
    barData,
    rollingBurnData,
    displayedTransactions,
  };
}
