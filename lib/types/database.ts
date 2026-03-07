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
  split_group_id: string | null;
  is_reimbursable?: boolean;
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
  chain: string | null;
  liquid_amount: number;
  locked_amount: number;
  last_price_usd: number | null;
  last_price_updated_at: string | null;
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

// --- Reimbursement types ---

export type ReimbursementStatus = "draft" | "submitted" | "approved" | "paid";

export interface ReimbursementRequest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  wallet: string;
  status: ReimbursementStatus;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface ReimbursementItem {
  id: string;
  user_id: string;
  reimbursement_request_id: string;
  transaction_id: string | null;
  description: string;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReimbursementPayment {
  id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReimbursementPaymentAllocation {
  id: string;
  user_id: string;
  payment_id: string;
  reimbursement_request_id: string;
  amount: number;
  created_at: string;
}

export interface ReimbursementSummary {
  id: string;
  user_id: string;
  title: string;
  wallet: string;
  status: ReimbursementStatus;
  total_amount: number;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  amount_paid: number;
  amount_outstanding: number;
  item_count: number;
  float_cost: number;
}

export interface ReimbursementRequestWithItems extends ReimbursementRequest {
  items: ReimbursementItem[];
}

// --- Forecast types ---

export type FlowDirection = "inflow" | "outflow";
export type FlowCadence = "monthly" | "biweekly" | "weekly" | "one_time";

export interface ScheduledFlow {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  direction: FlowDirection;
  cadence: FlowCadence;
  due_day: number | null;
  start_date: string | null;
  end_date: string | null;
  category: string | null;
  probability: number;
  earliest_date: string | null;
  latest_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ForecastTransformType =
  | "toggle_flow"
  | "delay_flow"
  | "scale_flow"
  | "add_one_time";

export interface ForecastTransform {
  type: ForecastTransformType;
  flow_name?: string;
  active?: boolean;
  delay_days?: number;
  factor?: number;
  name?: string;
  amount?: number;
  direction?: FlowDirection;
  date?: string;
}

export interface ForecastRun {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  horizon_days: number;
  starting_cash: number;
  transforms: ForecastTransform[];
  is_preset: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashForecast {
  id: string;
  user_id: string;
  forecast_run_id: string;
  forecast_date: string;
  day_index: number;
  base_balance: number;
  best_balance: number;
  worst_balance: number;
  inflows: number;
  outflows: number;
  events: ForecastEvent[];
  created_at: string;
}

export interface ForecastEvent {
  name: string;
  amount: number;
  direction: FlowDirection;
  type?: string;
}

export interface ForecastDayPoint {
  date: string;
  dayIndex: number;
  base: number;
  best: number;
  worst: number;
  inflows: number;
  outflows: number;
  events: ForecastEvent[];
}

export interface ForecastResult {
  runId: string;
  runName: string;
  timeSeries: ForecastDayPoint[];
  runway: number;
  minBalance: number;
  cashZeroDate: string | null;
}

// --- Debts with projections ---

export interface DebtPayoffProjection {
  monthsToPayoff: number | null;
  projectedPayoffDate: string | null;
  totalInterestCost: number;
  monthlyInterestCost: number;
}

export interface DebtWithProjections extends Debt {
  utilization: number;
  nextDueDate: string | null;
  projection: DebtPayoffProjection;
}

// --- Wallet P&L ---

export interface WalletPnlMonthly {
  wallet_id: string;
  month: string;
  income: number;
  expenses: number;
  net: number;
  reimbursable_expenses: number;
  transaction_count: number;
}
