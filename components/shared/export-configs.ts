import type { CsvColumnConfig } from "@/lib/csv-export";

/** Format an ISO date string to a human-readable date. */
function formatDate(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a number as currency (USD). */
function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

/** Format a percentage value. */
function formatPercent(value: unknown): string {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return `${(num * 100).toFixed(0)}%`;
}

/** Format arrays (e.g. tags) as comma-separated strings. */
function formatArray(value: unknown): string {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export type ExportModule = "tasks" | "contacts" | "pipeline" | "finance";

/** Supabase table name for each export module. */
export const MODULE_TABLES: Record<ExportModule, string> = {
  tasks: "tasks",
  contacts: "contacts",
  pipeline: "pipeline_items",
  finance: "transactions",
};

/** Human-readable labels for each module. */
export const MODULE_LABELS: Record<ExportModule, string> = {
  tasks: "Tasks",
  contacts: "Contacts",
  pipeline: "Pipeline",
  finance: "Finance",
};

/** Column configurations per module. */
export const EXPORT_COLUMNS: Record<ExportModule, CsvColumnConfig[]> = {
  tasks: [
    { key: "title", header: "Title" },
    { key: "status", header: "Status" },
    { key: "priority", header: "Priority" },
    { key: "assignee", header: "Assignee" },
    { key: "due_date", header: "Due Date", format: formatDate },
    { key: "tags", header: "Tags", format: formatArray },
    { key: "created_at", header: "Created", format: formatDate },
  ],
  contacts: [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "company", header: "Company" },
    { key: "role", header: "Role" },
    { key: "status", header: "Status" },
    { key: "score", header: "Score" },
    { key: "last_contact_date", header: "Last Contact", format: formatDate },
    { key: "created_at", header: "Created", format: formatDate },
  ],
  pipeline: [
    { key: "title", header: "Title" },
    { key: "stage_id", header: "Stage" },
    { key: "entity_type", header: "Entity Type" },
    { key: "sort_order", header: "Sort Order" },
    { key: "created_at", header: "Created", format: formatDate },
    { key: "updated_at", header: "Updated", format: formatDate },
  ],
  finance: [
    { key: "name", header: "Description" },
    { key: "amount", header: "Amount", format: formatCurrency },
    { key: "type", header: "Type" },
    { key: "category", header: "Category" },
    { key: "interval", header: "Interval" },
    { key: "due_day", header: "Due Day" },
    { key: "start_date", header: "Start Date", format: formatDate },
    { key: "created_at", header: "Created", format: formatDate },
  ],
};

// Re-export formatters for use in custom configs
export { formatDate, formatCurrency, formatPercent, formatArray };
