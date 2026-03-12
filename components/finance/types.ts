import type {
  Transaction,
  Debt,
  BalanceSnapshot,
  ReimbursementRequest,
} from "@/lib/types/database";
import type { FilterValues } from "@/components/ui";

// Re-export database types for convenience
export type { Transaction, Debt, BalanceSnapshot, ReimbursementRequest };

// --- Wallet views ---
export type WalletView = "overview" | "expenses" | "income" | "debts";

// --- Category colors ---
export const CATEGORY_COLORS: Record<string, string> = {
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

export const DEFAULT_COLOR = "#737373";

// --- Essential expense categories (used for Monthly Nut & Weekly Budget) ---
export const ESSENTIAL_CATEGORIES = new Set([
  "housing",
  "utilities",
  "insurance",
  "transportation",
  "debt_payment",
  "health",
]);

// --- Helpers ---
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Read a CSS variable from :root at render time so charts adapt to theme. */
export function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

// --- Upcoming payment helpers ---
export function getDaysUntilDue(dueDay: number): number {
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

export function getDueColor(daysUntil: number): string {
  if (daysUntil <= 2) return "#EF4444"; // red
  if (daysUntil <= 6) return "#EAB308"; // yellow
  return "#22C55E"; // green
}

export function getDueGroup(daysUntil: number): string {
  if (daysUntil <= 0) return "Overdue";
  if (daysUntil <= 7) return "This Week";
  if (daysUntil <= 14) return "Next 2 Weeks";
  return "Rest of Month";
}

// --- Filter / view constants ---
export const WALLET_VIEWS: { id: WalletView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "expenses", label: "Expenses" },
  { id: "income", label: "Income" },
  { id: "debts", label: "Debts" },
];

export type { FilterValues };
