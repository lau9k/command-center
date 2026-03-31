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

export type ExportModule = "tasks" | "contacts" | "pipeline" | "finance" | "content" | "sponsors" | "conversations";

/** Supabase table name for each export module. */
export const MODULE_TABLES: Record<ExportModule, string> = {
  tasks: "tasks",
  contacts: "contacts",
  pipeline: "pipeline_items",
  finance: "transactions",
  content: "content_posts",
  sponsors: "sponsors",
  conversations: "conversations",
};

/** Human-readable labels for each module. */
export const MODULE_LABELS: Record<ExportModule, string> = {
  tasks: "Tasks",
  contacts: "Contacts",
  pipeline: "Pipeline",
  finance: "Finance",
  content: "Content",
  sponsors: "Sponsors",
  conversations: "Conversations",
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
  content: [
    { key: "id", header: "ID" },
    { key: "title", header: "Title" },
    { key: "platform", header: "Platform" },
    { key: "status", header: "Status" },
    { key: "scheduled_date", header: "Scheduled Date", format: formatDate },
    { key: "published_date", header: "Published Date", format: formatDate },
    { key: "engagement_score", header: "Engagement Score" },
    { key: "content_type", header: "Content Type" },
  ],
  sponsors: [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
    { key: "tier", header: "Tier" },
    { key: "status", header: "Status" },
    { key: "amount", header: "Amount", format: formatCurrency },
    { key: "contact_name", header: "Contact Name" },
    { key: "contact_email", header: "Contact Email" },
    { key: "commitment_date", header: "Commitment Date", format: formatDate },
    { key: "notes", header: "Notes" },
  ],
  conversations: [
    { key: "id", header: "ID" },
    { key: "contact_name", header: "Contact Name" },
    { key: "channel", header: "Channel" },
    { key: "subject", header: "Subject" },
    { key: "status", header: "Status" },
    { key: "last_message_date", header: "Last Message Date", format: formatDate },
    { key: "message_count", header: "Message Count" },
    { key: "sentiment", header: "Sentiment" },
  ],
};

// Re-export formatters for use in custom configs
export { formatDate, formatCurrency, formatPercent, formatArray };
