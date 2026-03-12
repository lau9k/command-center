export type EventStatus = "planning" | "confirmed" | "in_progress" | "completed" | "cancelled";

export interface Event {
  id: string;
  user_id: string | null;
  project_id: string | null;
  name: string;
  date: string | null;
  location: string | null;
  status: EventStatus;
  budget_target: number;
  participant_target: number;
  created_at: string;
  updated_at: string;
}

export type SponsorTier = "bronze" | "silver" | "gold" | "platinum" | "title";
export type SponsorStatus = "not_contacted" | "contacted" | "negotiating" | "confirmed" | "declined";

export interface Sponsor {
  id: string;
  user_id: string | null;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  company_url: string | null;
  tier: SponsorTier;
  status: SponsorStatus;
  amount: number;
  currency: string;
  notes: string | null;
  event_id: string | null;
  created_at: string;
  updated_at: string;
}

export type OutreachType = "email" | "call" | "meeting" | "linkedin" | "other";
export type OutreachStatus = "sent" | "replied" | "no_response" | "follow_up_needed";

export interface SponsorOutreach {
  id: string;
  sponsor_id: string;
  type: OutreachType;
  subject: string | null;
  notes: string | null;
  status: OutreachStatus;
  contacted_at: string;
  created_at: string;
}

export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type ContactStatus = "active" | "inactive" | "lead" | "customer";
export type ContactSource = "manual" | "referral" | "website" | "linkedin" | "other";
export type NotificationType = "task" | "alert" | "info" | "signal";
export type TaskFeedbackAction = "approved" | "rejected" | "edited";
export type MemoryType = "contact" | "meeting" | "email" | "content" | "task";
export type ContentPostStatus = "draft" | "ready" | "scheduled" | "published" | "failed";
export type ContentItemStatus = "draft" | "scheduled" | "published" | "failed";
export type ContentItemPlatform = "twitter" | "telegram" | "linkedin" | "bluesky" | "instagram" | "facebook" | "reddit";
export type ContentItemBrand = "meek" | "personize" | "buildervault" | "telco" | "personal";
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
  external_id?: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assignee: string | null;
  tags: string[] | null;
  recurrence_rule: string | null;
  recurrence_parent_id: string | null;
  is_recurring_template: boolean;
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
  phone: string | null;
  company: string | null;
  role: string | null;
  source: ContactSource;
  status: ContactStatus;
  tags: string[];
  score: number;
  notes: string | null;
  last_contact_date: string | null;
  deleted_at: string | null;
  merged_into_id: string | null;
  created_at: string;
  updated_at: string;
  // Personize-specific fields (present when sourced from Personize SDK)
  record_id?: string;
  job_title?: string | null;
  has_conversation?: boolean;
  message_count?: number;
  priority_score?: number;
  last_interaction_date?: string | null;
}

export interface PipelineItem {
  id: string;
  pipeline_id: string;
  stage_id: string;
  project_id: string;
  user_id: string;
  title: string;
  entity_type: string | null;
  entity_id: string | null;
  sort_order: number;
  metadata: Record<string, unknown>;
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
  // Buffer-style fields
  caption: string | null;
  image_url: string | null;
  platforms: string[];
  scheduled_at: string | null;
  published_at: string | null;
  engagement: Record<string, unknown>;
  buffer_id: string | null;
  created_at: string;
  updated_at: string;
}

export type BufferPostStatus = "draft" | "scheduled" | "published" | "failed";

export const PLATFORM_COLORS: Record<string, string> = {
  twitter: "#1DA1F2",
  instagram: "#E4405F",
  tiktok: "#00F2EA",
  telegram: "#0088CC",
  linkedin: "#0A66C2",
  youtube: "#FF0000",
  reddit: "#FF4500",
  bluesky: "#0085FF",
  facebook: "#1877F2",
};

export const PLATFORM_LABELS: Record<string, string> = {
  twitter: "Twitter/X",
  instagram: "Instagram",
  tiktok: "TikTok",
  telegram: "Telegram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  reddit: "Reddit",
  bluesky: "Bluesky",
  facebook: "Facebook",
};

export interface ContentItem {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  platform: ContentItemPlatform;
  status: ContentItemStatus;
  brand: ContentItemBrand;
  narrative_arc_chapter: string | null;
  tone: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  late_so_id: string | null;
  metadata: Record<string, unknown>;
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

// --- Conversation types ---

export interface Conversation {
  id: string;
  project_id: string | null;
  user_id: string;
  contact_id: string | null;
  summary: string | null;
  channel: string | null;
  last_message_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Import types ---

export type ImportStatus = "pending" | "processing" | "complete" | "failed";

export interface Import {
  id: string;
  filename: string;
  record_count: number;
  status: ImportStatus;
  mapped_data: Record<string, string | null>[];
  field_mapping: Record<string, string>;
  processed_count: number;
  error_count: number;
  error_details: { index: number; email: string | null; error: string }[];
  created_at: string;
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

// --- Gmail types ---

export type GmailAccountStatus = "active" | "inactive";

export interface GmailAccount {
  id: string;
  user_id: string | null;
  email_address: string;
  refresh_token_encrypted: string;
  history_id: string | null;
  status: GmailAccountStatus;
  created_at: string;
  updated_at: string;
}

export interface GmailMessage {
  id: string;
  gmail_account_id: string;
  gmail_message_id: string;
  gmail_thread_id: string;
  subject: string | null;
  snippet: string | null;
  from_address: string | null;
  from_name: string | null;
  to_addresses: { name: string | null; email: string }[];
  date: string | null;
  label_ids: string[];
  is_unread: boolean;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

// --- Plaid types ---

export type PlaidItemStatus = "active" | "inactive";

export interface PlaidItem {
  id: string;
  user_id: string;
  item_id: string;
  access_token_encrypted: string;
  plaid_cursor: string | null;
  institution_name: string | null;
  status: PlaidItemStatus;
  created_at: string;
  updated_at: string;
}

export interface PlaidAccount {
  id: string;
  user_id: string;
  plaid_item_id: string;
  account_id: string;
  name: string | null;
  official_name: string | null;
  type: string | null;
  subtype: string | null;
  mask: string | null;
  created_at: string;
  updated_at: string;
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

// --- Meeting types ---

export type MeetingStatus = "pending_review" | "reviewed" | "dismissed";
export type MeetingActionType = "follow_up_email" | "create_document" | "make_intro" | "add_contact" | "create_task" | "custom";
export type MeetingActionStatus = "pending" | "completed" | "skipped";

export interface MeetingAttendee {
  name: string;
  email?: string;
  company?: string;
}

export interface MeetingActionItem {
  title: string;
  assignee?: string;
  due_date?: string;
}

export interface MeetingContact {
  name: string;
  email?: string;
  company?: string;
  role?: string;
}

export interface Meeting {
  id: string;
  user_id: string | null;
  granola_id: string | null;
  title: string;
  attendees: MeetingAttendee[];
  summary: string | null;
  decisions: string[];
  action_items: MeetingActionItem[];
  new_contacts: MeetingContact[];
  status: MeetingStatus;
  meeting_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingAction {
  id: string;
  meeting_id: string;
  action_type: MeetingActionType;
  description: string;
  status: MeetingActionStatus;
  metadata: Record<string, unknown>;
  created_at: string;
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

// --- Email Template types ---

export type EmailTemplateCategory = "general" | "outreach" | "follow_up" | "introduction" | "proposal" | "thank_you";

export interface EmailTemplate {
  id: string;
  user_id: string | null;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  category: EmailTemplateCategory;
  created_at: string;
  updated_at: string;
}
