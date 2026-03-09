"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  CreditCard,
  Landmark,
  Eye,
  EyeOff,
  CalendarClock,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/ui";
import { DataTable } from "@/components/ui";
import { FilterBar } from "@/components/ui";
import type { FilterDefinition, FilterValues, ColumnDef } from "@/components/ui";
import type {
  Transaction,
  Debt,
  BalanceSnapshot,
  ReimbursementRequest,
} from "@/lib/types/database";
import { TransactionDetailDrawer } from "@/components/finance/TransactionDetailDrawer";

/** Read a CSS variable from :root at render time so charts adapt to theme. */
function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// --- Category colors ---
const CATEGORY_COLORS: Record<string, string> = {
  housing: "#3B82F6",
  utilities: "#6366F1",
  subscriptions: "#8B5CF6",
  transportation: "#EC4899",
  food: "#F97316",
  health: "#22C55E",
  personal: "#14B8A6",
  debt_payment: "#EF4444",
  insurance: "#EAB308",
  education: "#06B6D4",
  entertainment: "#A855F7",
  shopping: "#F43F5E",
  fees: "#78716C",
  freelance: "#22C55E",
  business: "#3B82F6",
  prize: "#EAB308",
  consulting: "#6366F1",
  tax_refund: "#14B8A6",
};

const DEFAULT_COLOR = "#737373";

// --- Essential expense categories (used for Monthly Nut & Weekly Budget) ---
const ESSENTIAL_CATEGORIES = new Set([
  "housing",
  "utilities",
  "insurance",
  "transportation",
  "debt_payment",
  "health",
]);

// --- Upcoming payment helpers ---
function getDaysUntilDue(dueDay: number): number {
  const today = new Date();
  const currentDay = today.getDate();
  const lastDayOfMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate();
  const effectiveDueDay = Math.min(dueDay, lastDayOfMonth);

  if (effectiveDueDay >= currentDay) {
    return effectiveDueDay - currentDay;
  }
  // Already passed this month — treat as overdue
  return effectiveDueDay - currentDay; // negative = overdue
}

function getDueColor(daysUntil: number): string {
  if (daysUntil <= 2) return "#EF4444"; // red
  if (daysUntil <= 6) return "#EAB308"; // yellow
  return "#22C55E"; // green
}

function getDueGroup(daysUntil: number): string {
  if (daysUntil <= 0) return "Overdue";
  if (daysUntil <= 7) return "This Week";
  if (daysUntil <= 14) return "Next 2 Weeks";
  return "Rest of Month";
}

// --- Wallet views ---
type WalletView = "overview" | "expenses" | "income" | "debts";

const WALLET_VIEWS: { id: WalletView; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Wallet className="size-4" /> },
  { id: "expenses", label: "Expenses", icon: <TrendingDown className="size-4" /> },
  { id: "income", label: "Income", icon: <TrendingUp className="size-4" /> },
  { id: "debts", label: "Debts", icon: <CreditCard className="size-4" /> },
];

// --- Filter definitions ---
const CATEGORY_OPTIONS = Object.keys(CATEGORY_COLORS).map((c) => ({
  label: c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
  value: c,
}));

const INTERVAL_OPTIONS = [
  { label: "Monthly", value: "monthly" },
  { label: "Biweekly", value: "biweekly" },
  { label: "Weekly", value: "weekly" },
  { label: "One-time", value: "one_time" },
];

const FILTER_DEFS: FilterDefinition[] = [
  { id: "category", label: "Category", options: CATEGORY_OPTIONS },
  { id: "interval", label: "Interval", options: INTERVAL_OPTIONS },
];

// --- Helper ---
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount);
}

// --- Custom tooltip ---
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; payload?: { fill?: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 text-muted-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-foreground">
          {p.name}: {formatCurrencyFull(p.value)}
        </p>
      ))}
    </div>
  );
}

// --- Transaction table columns ---
const TRANSACTION_COLUMNS: ColumnDef<Transaction>[] = [
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    sortable: true,
    cell: (row) => (
      <span className="flex items-center gap-2">
        <span>{row.name}</span>
        {row.split_group_id && (
          <span className="rounded bg-[#3B82F6]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#3B82F6]">
            Split
          </span>
        )}
      </span>
    ),
  },
  {
    id: "amount",
    header: "Amount",
    accessorKey: "amount",
    sortable: true,
    cell: (row) => (
      <span
        className={cn(
          "font-medium",
          row.type === "income" ? "text-[#22C55E]" : "text-foreground"
        )}
      >
        {row.type === "income" ? "+" : "-"}
        {formatCurrencyFull(Number(row.amount))}
      </span>
    ),
  },
  {
    id: "category",
    header: "Category",
    accessorKey: "category",
    sortable: true,
    cell: (row) => (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block size-2 rounded-full"
          style={{
            backgroundColor:
              CATEGORY_COLORS[row.category ?? ""] ?? DEFAULT_COLOR,
          }}
        />
        <span className="capitalize text-muted-foreground">
          {(row.category ?? "—").replace(/_/g, " ")}
        </span>
      </span>
    ),
  },
  {
    id: "interval",
    header: "Interval",
    accessorKey: "interval",
    sortable: true,
    cell: (row) => (
      <span className="capitalize text-muted-foreground">
        {row.interval.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    id: "due_day",
    header: "Due Day",
    accessorKey: "due_day",
    sortable: true,
    cell: (row) => (
      <span className="text-muted-foreground">
        {row.due_day ? `Day ${row.due_day}` : "—"}
      </span>
    ),
  },
];

// --- Debt table columns ---
const DEBT_COLUMNS: ColumnDef<Debt>[] = [
  { id: "name", header: "Name", accessorKey: "name", sortable: true },
  {
    id: "balance",
    header: "Balance",
    accessorKey: "balance",
    sortable: true,
    cell: (row) => (
      <span className="font-medium text-[#EF4444]">
        {formatCurrencyFull(Number(row.balance))}
      </span>
    ),
  },
  {
    id: "principal",
    header: "Principal",
    accessorKey: "principal",
    sortable: true,
    cell: (row) => (
      <span className="text-muted-foreground">
        {formatCurrencyFull(Number(row.principal))}
      </span>
    ),
  },
  {
    id: "interest_rate",
    header: "Rate",
    accessorKey: "interest_rate",
    sortable: true,
    cell: (row) => (
      <span className="text-muted-foreground">
        {row.interest_rate != null ? `${row.interest_rate}%` : "0%"}
      </span>
    ),
  },
  {
    id: "min_payment",
    header: "Min Payment",
    accessorKey: "min_payment",
    sortable: true,
    cell: (row) => (
      <span className="text-muted-foreground">
        {row.min_payment != null
          ? formatCurrencyFull(Number(row.min_payment))
          : "—"}
      </span>
    ),
  },
  {
    id: "lender",
    header: "Lender",
    accessorKey: "lender",
    cell: (row) => (
      <span className="text-muted-foreground">{row.lender ?? "—"}</span>
    ),
  },
];

// --- Props ---
interface FinanceDashboardProps {
  transactions: Transaction[];
  debts: Debt[];
  snapshots: BalanceSnapshot[];
  reimbursementRequests?: ReimbursementRequest[];
}

export function FinanceDashboard({
  transactions,
  debts,
  snapshots,
  reimbursementRequests = [],
}: FinanceDashboardProps) {
  const [walletView, setWalletView] = useState<WalletView>("overview");
  const [filterValues, setFilterValues] = useState<FilterValues>({
    category: [],
    interval: [],
  });
  const [truePersonalSpend, setTruePersonalSpend] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTransactionClick = useCallback((row: Transaction) => {
    setSelectedTransaction(row);
    setDrawerOpen(true);
  }, []);

  // Filter out reimbursable transactions when "True Personal Spend" is active
  const effectiveTransactions = useMemo(() => {
    if (!truePersonalSpend) return transactions;
    return transactions.filter(
      (t) => !(t as Transaction & { is_reimbursable?: boolean }).is_reimbursable
    );
  }, [transactions, truePersonalSpend]);

  // --- Computed data ---
  const latestSnapshot = snapshots[0] ?? null;

  const monthlyExpenses = useMemo(
    () =>
      effectiveTransactions
        .filter((t) => t.type === "expense" && t.interval !== "one_time")
        .reduce((sum, t) => {
          const amt = Number(t.amount);
          if (t.interval === "biweekly") return sum + amt * 2;
          if (t.interval === "weekly") return sum + amt * 4;
          return sum + amt;
        }, 0),
    [effectiveTransactions]
  );

  const monthlyIncome = useMemo(
    () =>
      effectiveTransactions
        .filter((t) => t.type === "income" && t.interval !== "one_time")
        .reduce((sum, t) => {
          const amt = Number(t.amount);
          if (t.interval === "biweekly") return sum + amt * 2;
          if (t.interval === "weekly") return sum + amt * 4;
          return sum + amt;
        }, 0),
    [effectiveTransactions]
  );

  const totalDebt = useMemo(
    () => debts.reduce((sum, d) => sum + Number(d.balance), 0),
    [debts]
  );

  const monthlySavings = monthlyIncome - monthlyExpenses;

  // --- Monthly Nut: total essential recurring expenses ---
  const monthlyEssentials = useMemo(
    () =>
      effectiveTransactions
        .filter(
          (t) =>
            t.type === "expense" &&
            t.interval !== "one_time" &&
            ESSENTIAL_CATEGORIES.has(t.category ?? "")
        )
        .reduce((sum, t) => {
          const amt = Number(t.amount);
          if (t.interval === "biweekly") return sum + amt * 2;
          if (t.interval === "weekly") return sum + amt * 4;
          return sum + amt;
        }, 0),
    [effectiveTransactions]
  );

  // --- Weekly Discretionary Budget ---
  const weeklyBudget = useMemo(() => {
    const discretionary = (monthlyIncome - monthlyEssentials) / 4.33;
    return Math.max(0, discretionary);
  }, [monthlyIncome, monthlyEssentials]);

  // Weekly discretionary spend (non-essential expenses normalized to weekly)
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
        return sum + amt; // weekly
      }, 0);
  }, [effectiveTransactions]);

  // --- Upcoming Payments: recurring expenses sorted by due_day ---
  const upcomingPayments = useMemo(() => {
    const recurring = effectiveTransactions.filter(
      (t) => t.type === "expense" && t.interval !== "one_time" && t.due_day != null
    );

    return recurring
      .map((t) => ({
        ...t,
        daysUntil: getDaysUntilDue(t.due_day!),
      }))
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [effectiveTransactions]);

  // Group upcoming payments
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

  // --- Invoicing Tracker: outstanding vs received reimbursements ---
  const outstandingReimbursements = useMemo(
    () =>
      reimbursementRequests.filter(
        (r) => r.status === "submitted" || r.status === "approved"
      ),
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

  // --- Spending breakdown by category (pie chart) ---
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

  // --- Monthly trend bar chart (income vs expenses by category group) ---
  const barData = useMemo(() => {
    const topCategories = categoryBreakdown.slice(0, 6);
    return topCategories.map((c) => ({
      name: c.name.length > 12 ? c.name.slice(0, 10) + "…" : c.name,
      amount: c.value,
      fill: c.fill,
    }));
  }, [categoryBreakdown]);

  // --- Group split transactions in All Wallets view ---
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

    // For each split group, show one representative row with total amount
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

  // --- Filtered transactions for the table ---
  const displayedTransactions = useMemo(() => {
    let filtered = groupedTransactions;

    // Filter by wallet view
    if (walletView === "expenses") {
      filtered = effectiveTransactions.filter((t) => t.type === "expense");
    } else if (walletView === "income") {
      filtered = effectiveTransactions.filter((t) => t.type === "income");
    }

    // Apply filter bar
    if (filterValues.category.length > 0) {
      filtered = filtered.filter((t) =>
        filterValues.category.includes(t.category ?? "")
      );
    }
    if (filterValues.interval.length > 0) {
      filtered = filtered.filter((t) =>
        filterValues.interval.includes(t.interval)
      );
    }

    return filtered;
  }, [effectiveTransactions, groupedTransactions, walletView, filterValues]);

  // --- Monthly income vs expenses data for overview chart ---
  const rollingBurnData = useMemo(() => {
    // Group expenses and income by month (using start_date or created_at)
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
        windowSlice.reduce((s, m) => s + (monthlyExp.get(m) ?? 0), 0) /
        windowSlice.length;
      return {
        month,
        expenses,
        income,
        rollingAvg: Math.round(avg),
      };
    });
  }, [effectiveTransactions]);

  return (
    <div className="flex flex-col gap-6">
      {/* Wallet Context Switcher + True Personal Spend Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
          {WALLET_VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => setWalletView(view.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                walletView === view.id
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {view.icon}
              {view.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setTruePersonalSpend((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
            truePersonalSpend
              ? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]"
              : "border-border bg-background text-muted-foreground hover:border-ring hover:text-foreground"
          )}
        >
          {truePersonalSpend ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          True Personal Spend
        </button>
      </div>

      {/* Weekly Budget + Monthly Nut Cards */}
      {walletView !== "debts" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Weekly Discretionary Budget Card */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                This Week&apos;s Budget
              </span>
              <Wallet className="size-4 text-muted-foreground" />
            </div>
            <div className="mb-2 text-[32px] font-bold leading-none text-foreground">
              {formatCurrency(Math.max(0, weeklyBudget - weeklySpent))}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                remaining
              </span>
            </div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatCurrency(weeklySpent)} spent of{" "}
                {formatCurrency(weeklyBudget)}
              </span>
              <span>
                {weeklyBudget > 0
                  ? `${Math.min(100, Math.round((weeklySpent / weeklyBudget) * 100))}%`
                  : "0%"}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, weeklyBudget > 0 ? (weeklySpent / weeklyBudget) * 100 : 0)}%`,
                  backgroundColor:
                    weeklySpent > weeklyBudget ? "#EF4444" : "#22C55E",
                }}
              />
            </div>
            {weeklySpent > weeklyBudget && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#EF4444]">
                <AlertTriangle className="size-3.5" />
                Over budget by {formatCurrency(weeklySpent - weeklyBudget)}
              </div>
            )}
          </div>

          {/* Monthly Nut Card */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Monthly Nut
              </span>
              <Receipt className="size-4 text-muted-foreground" />
            </div>
            <div className="mb-2 text-[32px] font-bold leading-none text-foreground">
              {formatCurrency(monthlyEssentials)}
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Essential recurring expenses (housing, utilities, insurance,
              transport, health, debt)
            </p>
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">vs Income</span>
              <span
                className={cn(
                  "font-medium",
                  monthlyIncome - monthlyEssentials >= 0
                    ? "text-[#22C55E]"
                    : "text-[#EF4444]"
                )}
              >
                {monthlyIncome - monthlyEssentials >= 0 ? "+" : ""}
                {formatCurrency(monthlyIncome - monthlyEssentials)} gap
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Monthly Income"
          value={formatCurrency(monthlyIncome)}
          icon={<TrendingUp className="size-5" />}
        />
        <KpiCard
          label="Monthly Expenses"
          value={formatCurrency(monthlyExpenses)}
          icon={<TrendingDown className="size-5" />}
        />
        <KpiCard
          label="Monthly Savings"
          value={formatCurrency(monthlySavings)}
          subtitle={
            monthlyIncome > 0
              ? `${Math.round((monthlySavings / monthlyIncome) * 100)}% savings rate`
              : undefined
          }
          icon={<DollarSign className="size-5" />}
        />
        {walletView === "debts" ? (
          <KpiCard
            label="Total Debt"
            value={formatCurrency(totalDebt)}
            subtitle={`${debts.length} accounts`}
            icon={<CreditCard className="size-5" />}
          />
        ) : (
          <KpiCard
            label="Net Worth"
            value={formatCurrency(
              latestSnapshot ? Number(latestSnapshot.net_worth ?? 0) : 0
            )}
            subtitle={
              latestSnapshot
                ? `Chq: ${formatCurrency(Number(latestSnapshot.chequing ?? 0))} · Sav: ${formatCurrency(Number(latestSnapshot.savings ?? 0))}`
                : undefined
            }
            icon={<Landmark className="size-5" />}
          />
        )}
      </div>

      {/* Charts row */}
      {walletView !== "debts" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Spending Breakdown Pie */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Spending Breakdown
            </h3>
            {categoryBreakdown.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-1 flex-col gap-1.5">
                  {categoryBreakdown.slice(0, 8).map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: c.fill }}
                        />
                        <span className="capitalize text-muted-foreground">
                          {c.name}
                        </span>
                      </span>
                      <span className="text-foreground">
                        {formatCurrency(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No expense data
              </p>
            )}
          </div>

          {/* Where Your Money Goes Bar Chart */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Where Your Money Goes
            </h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} layout="vertical">
                  <XAxis
                    type="number"
                    tick={{ fill: cssVar("--chart-tick", "#737373"), fontSize: 11 }}
                    tickFormatter={(v) => formatCurrency(v)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: cssVar("--chart-legend", "#A0A0A0"), fontSize: 11 }}
                    width={90}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No expense data
              </p>
            )}
          </div>
        </div>
      )}

      {/* Monthly Income vs Expenses Chart */}
      {walletView === "overview" && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            Monthly Income vs Expenses
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Cyan line = 3-month trend
          </p>
          {rollingBurnData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={rollingBurnData}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: cssVar("--chart-tick", "#737373"), fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: cssVar("--chart-tick", "#737373"), fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(v)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#22C55E"
                  fillOpacity={0.3}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#EF4444"
                  fillOpacity={0.3}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="rollingAvg"
                  name="3-Mo Avg Expenses"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Need at least 2 months of data to show trends
            </p>
          )}
        </div>
      )}

      {/* Upcoming Payments & Invoicing Tracker */}
      {walletView !== "debts" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Upcoming Payments Section */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Upcoming Payments
              </h3>
            </div>
            {paymentGroups.length > 0 ? (
              <div className="flex flex-col gap-4">
                {paymentGroups.map((group) => (
                  <div key={group.label}>
                    <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </h4>
                    <div className="flex flex-col gap-1.5">
                      {group.items.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block size-2 rounded-full"
                              style={{
                                backgroundColor: getDueColor(p.daysUntil),
                              }}
                            />
                            <span className="text-foreground">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {p.daysUntil < 0
                                ? `${Math.abs(p.daysUntil)}d overdue`
                                : p.daysUntil === 0
                                  ? "Due today"
                                  : `in ${p.daysUntil}d`}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(Number(p.amount))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No recurring payments with due dates
              </p>
            )}
          </div>

          {/* Invoicing Tracker */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">
                Money Owed to Me
              </h3>
            </div>
            <div className="mb-4 rounded-md bg-muted/50 px-3 py-2 text-center">
              <span className="text-2xl font-bold text-foreground">
                {formatCurrency(totalOutstanding)}
              </span>
              <span className="ml-2 text-sm text-muted-foreground">
                outstanding
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Outstanding column */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Outstanding
                </h4>
                {outstandingReimbursements.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {outstandingReimbursements.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <div className="flex flex-col">
                          <span className="text-foreground">{r.title}</span>
                          <span className="text-[10px] capitalize text-muted-foreground">
                            {r.status}
                          </span>
                        </div>
                        <span className="font-medium text-[#EAB308]">
                          {formatCurrency(Number(r.total_amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    None
                  </p>
                )}
              </div>
              {/* Received column */}
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Received
                </h4>
                {receivedReimbursements.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {receivedReimbursements.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <span className="text-foreground">{r.title}</span>
                        <span className="font-medium text-[#22C55E]">
                          {formatCurrency(Number(r.total_amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    None yet
                  </p>
                )}
                {totalReceived > 0 && (
                  <div className="mt-2 border-t border-border pt-2 text-right text-xs text-muted-foreground">
                    Total: {formatCurrency(totalReceived)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction / Debt list */}
      {walletView === "debts" ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Debt Accounts
          </h3>
          <DataTable
            columns={DEBT_COLUMNS}
            data={debts}
            rowKey={(row) => row.id}
            pageSize={10}
          />
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-start justify-between gap-4">
            <h3 className="text-sm font-semibold text-foreground">
              {walletView === "expenses"
                ? "Expenses"
                : walletView === "income"
                  ? "Income"
                  : "All Transactions"}
            </h3>
            <FilterBar
              filters={FILTER_DEFS}
              values={filterValues}
              onChange={setFilterValues}
            />
          </div>
          <DataTable
            columns={TRANSACTION_COLUMNS}
            data={displayedTransactions}
            rowKey={(row) => row.id}
            pageSize={15}
            onRowClick={handleTransactionClick}
          />
        </div>
      )}

      {/* Transaction Detail Drawer */}
      <TransactionDetailDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        reimbursementRequests={reimbursementRequests}
        onUpdate={() => window.location.reload()}
      />
    </div>
  );
}
