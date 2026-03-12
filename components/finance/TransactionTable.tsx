import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui";
import type { ColumnDef, FilterValues } from "@/components/ui";
import { TransactionFilterBar } from "./FinanceFilters";
import {
  CATEGORY_COLORS,
  DEFAULT_COLOR,
  formatCurrencyFull,
  type Transaction,
  type Debt,
} from "./types";

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

// --- Transaction / Debt Table Section ---
interface TransactionTableProps {
  walletView: string;
  debts: Debt[];
  displayedTransactions: Transaction[];
  filterValues: FilterValues;
  onFilterChange: (values: FilterValues) => void;
  onRowClick: (row: Transaction) => void;
}

export function TransactionTableSection({
  walletView,
  debts,
  displayedTransactions,
  filterValues,
  onFilterChange,
  onRowClick,
}: TransactionTableProps) {
  const tableTitle =
    walletView === "expenses"
      ? "Expenses"
      : walletView === "income"
        ? "Income"
        : "All Transactions";

  if (walletView === "debts") {
    return (
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
    );
  }

  return (
    <div>
      <TransactionFilterBar
        filterValues={filterValues}
        onFilterChange={onFilterChange}
        tableTitle={tableTitle}
      />
      <DataTable
        columns={TRANSACTION_COLUMNS}
        data={displayedTransactions}
        rowKey={(row) => row.id}
        pageSize={15}
        onRowClick={onRowClick}
      />
    </div>
  );
}
