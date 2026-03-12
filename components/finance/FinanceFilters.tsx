import {
  Wallet,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterBar } from "@/components/ui";
import type { FilterDefinition, FilterValues } from "@/components/ui";
import { CATEGORY_COLORS, WALLET_VIEWS, type WalletView } from "./types";

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

const VIEW_ICONS: Record<WalletView, React.ReactNode> = {
  overview: <Wallet className="size-4" />,
  expenses: <TrendingDown className="size-4" />,
  income: <TrendingUp className="size-4" />,
  debts: <CreditCard className="size-4" />,
};

interface FinanceFiltersProps {
  walletView: WalletView;
  onWalletViewChange: (view: WalletView) => void;
  truePersonalSpend: boolean;
  onTruePersonalSpendChange: (value: boolean) => void;
  filterValues: FilterValues;
  onFilterChange: (values: FilterValues) => void;
  showFilterBar: boolean;
  tableTitle: string;
}

export function WalletViewSwitcher({
  walletView,
  onWalletViewChange,
  truePersonalSpend,
  onTruePersonalSpendChange,
}: Pick<
  FinanceFiltersProps,
  "walletView" | "onWalletViewChange" | "truePersonalSpend" | "onTruePersonalSpendChange"
>) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
        {WALLET_VIEWS.map((view) => (
          <button
            key={view.id}
            onClick={() => onWalletViewChange(view.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              walletView === view.id
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {VIEW_ICONS[view.id]}
            {view.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => onTruePersonalSpendChange(!truePersonalSpend)}
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
  );
}

export function TransactionFilterBar({
  filterValues,
  onFilterChange,
  tableTitle,
}: Pick<FinanceFiltersProps, "filterValues" | "onFilterChange" | "tableTitle">) {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <h3 className="text-sm font-semibold text-foreground">{tableTitle}</h3>
      <FilterBar
        filters={FILTER_DEFS}
        values={filterValues}
        onChange={onFilterChange}
      />
    </div>
  );
}
