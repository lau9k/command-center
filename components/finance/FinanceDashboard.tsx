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

const DEFAULT_COLOR = "#666666";

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
    <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 text-[#A0A0A0]">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-[#FAFAFA]">
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
          row.type === "income" ? "text-[#22C55E]" : "text-[#FAFAFA]"
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
        <span className="capitalize text-[#A0A0A0]">
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
      <span className="capitalize text-[#A0A0A0]">
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
      <span className="text-[#A0A0A0]">
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
      <span className="text-[#A0A0A0]">
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
      <span className="text-[#A0A0A0]">
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
      <span className="text-[#A0A0A0]">
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
      <span className="text-[#A0A0A0]">{row.lender ?? "—"}</span>
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

  // --- Rolling average burn data for overview chart ---
  const rollingBurnData = useMemo(() => {
    // Group expenses by month (using start_date or created_at)
    const monthlyExpenses = new Map<string, number>();
    effectiveTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const dateStr = t.start_date ?? t.created_at;
        const d = new Date(dateStr);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthlyExpenses.set(
          monthKey,
          (monthlyExpenses.get(monthKey) ?? 0) + Number(t.amount)
        );
      });

    const sortedMonths = Array.from(monthlyExpenses.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    return sortedMonths.map((entry, i, arr) => {
      const windowStart = Math.max(0, i - 2);
      const window = arr.slice(windowStart, i + 1);
      const avg =
        window.reduce((s, [, v]) => s + v, 0) / window.length;
      return {
        month: entry[0],
        expenses: entry[1],
        rollingAvg: Math.round(avg),
      };
    });
  }, [effectiveTransactions]);

  return (
    <div className="flex flex-col gap-6">
      {/* Wallet Context Switcher + True Personal Spend Toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-1">
          {WALLET_VIEWS.map((view) => (
            <button
              key={view.id}
              onClick={() => setWalletView(view.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                walletView === view.id
                  ? "bg-[#1E1E1E] text-[#FAFAFA]"
                  : "text-[#A0A0A0] hover:text-[#FAFAFA]"
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
              : "border-[#2A2A2A] bg-[#0A0A0A] text-[#A0A0A0] hover:border-[#3A3A3A] hover:text-[#FAFAFA]"
          )}
        >
          {truePersonalSpend ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          True Personal Spend
        </button>
      </div>

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
          <div className="rounded-[12px] border border-[#2A2A2A] bg-[#141414] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#FAFAFA]">
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
                        <span className="capitalize text-[#A0A0A0]">
                          {c.name}
                        </span>
                      </span>
                      <span className="text-[#FAFAFA]">
                        {formatCurrency(c.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[#666666]">
                No expense data
              </p>
            )}
          </div>

          {/* Top Categories Bar Chart */}
          <div className="rounded-[12px] border border-[#2A2A2A] bg-[#141414] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#FAFAFA]">
              Top Expense Categories
            </h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} layout="vertical">
                  <XAxis
                    type="number"
                    tick={{ fill: "#666666", fontSize: 11 }}
                    tickFormatter={(v) => formatCurrency(v)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fill: "#A0A0A0", fontSize: 11 }}
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
              <p className="py-8 text-center text-sm text-[#666666]">
                No expense data
              </p>
            )}
          </div>
        </div>
      )}

      {/* Rolling Average Burn Chart */}
      {walletView === "overview" && rollingBurnData.length > 1 && (
        <div className="rounded-[12px] border border-[#2A2A2A] bg-[#141414] p-5">
          <h3 className="mb-4 text-sm font-semibold text-[#FAFAFA]">
            Monthly Burn &amp; 3-Month Rolling Average
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={rollingBurnData}>
              <XAxis
                dataKey="month"
                tick={{ fill: "#666666", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#666666", fontSize: 11 }}
                tickFormatter={(v) => formatCurrency(v)}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="expenses"
                name="Monthly Expenses"
                fill="#EF4444"
                fillOpacity={0.3}
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="rollingAvg"
                name="3-Mo Avg"
                stroke="#EF4444"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transaction / Debt list */}
      {walletView === "debts" ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#FAFAFA]">
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
            <h3 className="text-sm font-semibold text-[#FAFAFA]">
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
