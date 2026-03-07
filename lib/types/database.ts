export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type ContactStatus = "active" | "inactive" | "lead" | "customer";
export type ContactSource = "manual" | "referral" | "website" | "linkedin" | "other";
export type NotificationType = "task" | "alert" | "info" | "signal";
export type TaskFeedbackAction = "approved" | "rejected" | "edited";
export type MemoryType = "contact" | "meeting" | "email" | "content" | "task";
export type ContentPostStatus = "draft" | "ready" | "scheduled" | "published";
export type InvoiceStatus = "draft" | "sent" | "overdue" | "paid" | "cancelled";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithProject extends Task {
  projects: Pick<Project, "id" | "name" | "color"> | null;
}

export interface Contact {
  id: string;
  project_id: string;
  name: string;
  email: string | null;
  company: string | null;
  source: ContactSource;
  status: ContactStatus;
  created_at: string;
  updated_at: string;
}

export interface PipelineItem {
  id: string;
  project_id: string;
  title: string;
  stage: string;
  value: number | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  project_id: string | null;
  source: string | null;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export interface TaskFeedback {
  id: string;
  task_id: string;
  action: TaskFeedbackAction;
  original_suggestion: Record<string, unknown> | null;
  user_correction: string | null;
  reason: string | null;
  created_at: string;
}

export interface MemoryStat {
  id: string;
  project_id: string;
  memory_type: MemoryType;
  count: number;
  last_synced_at: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
}

export interface ContentPost {
  id: string;
  project_id: string | null;
  title: string | null;
  body: string | null;
  platform: string | null;
  type: string;
  status: ContentPostStatus;
  scheduled_for: string | null;
  late_post_id: string | null;
  media_urls: string[] | null;
  metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  project_id: string | null;
  title: string;
  amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  recipient: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// --- Finance types ---

export type TransactionType = "expense" | "income";
export type TransactionInterval = "monthly" | "biweekly" | "weekly" | "one_time";
export type DebtType = "loan" | "credit_line" | "personal";

export interface Transaction {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  type: TransactionType;
  category: string | null;
  interval: TransactionInterval;
  due_day: number | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  type: DebtType;
  principal: number;
  balance: number;
  interest_rate: number | null;
  min_payment: number | null;
  due_day: number | null;
  lender: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CryptoBalance {
  id: string;
  user_id: string;
  symbol: string;
  name: string | null;
  quantity: number;
  cost_basis: number | null;
  wallet: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BalanceSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  chequing: number | null;
  savings: number | null;
  credit_available: number | null;
  total_debt: number | null;
  net_worth: number | null;
  notes: string | null;
  created_at: string;
}
