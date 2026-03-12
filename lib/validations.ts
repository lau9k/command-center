import { z } from "zod";

// ── Contacts ──────────────────────────────────────────────

export const createContactSchema = z.object({
  name: z.string().min(1).max(500),
  email: z.string().email().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(500).optional().nullable(),
  role: z.string().max(500).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  tags: z.array(z.string().max(100)).optional().nullable(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export const updateContactSchema = createContactSchema.partial();

// ── Tasks ─────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  due_date: z.string().datetime().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().max(200).optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

// ── Content Posts ─────────────────────────────────────────

export const createContentPostSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().max(50000).optional().nullable(),
  caption: z.string().max(5000).optional().nullable(),
  platform: z.string().max(100).optional().nullable(),
  status: z.string().max(50).optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
  published_at: z.string().datetime().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  media_urls: z.array(z.string().url()).optional().nullable(),
  buffer_profile_ids: z.array(z.string()).optional().nullable(),
  buffer_post_id: z.string().max(200).optional().nullable(),
  buffer_status: z.string().max(50).optional().nullable(),
  buffer_sent_at: z.string().datetime().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateContentPostSchema = createContentPostSchema.partial().extend({
  id: z.string().uuid(),
});

// ── Content Items ────────────────────────────────────────

export const createContentItemSchema = z.object({
  title: z.string().max(500).optional().nullable(),
  body: z.string().min(1).max(10000),
  platform: z.enum(["twitter", "linkedin", "telegram", "bluesky", "instagram", "facebook", "reddit"]),
  brand: z.enum(["meek", "personize", "buildervault", "telco", "personal"]),
  status: z.enum(["draft", "scheduled", "published", "failed"]).default("draft").optional(),
  scheduled_for: z.string().datetime().optional().nullable(),
  tone: z.string().max(100).optional().nullable(),
  narrative_arc_chapter: z.string().max(200).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateContentItemSchema = createContentItemSchema.partial();

export const publishContentItemSchema = z.object({
  contentItemId: z.string().uuid(),
});

// ── Transactions ──────────────────────────────────────────

export const createTransactionSchema = z.object({
  date: z.string().max(50),
  description: z.string().max(1000),
  amount: z.number(),
  currency: z.string().max(10).optional(),
  category: z.string().max(200).optional().nullable(),
  wallet: z.string().max(200).optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export const updateTransactionSchema = createTransactionSchema.partial().extend({
  id: z.string().uuid(),
});

// ── Debts ─────────────────────────────────────────────────

export const createDebtSchema = z.object({
  name: z.string().min(1).max(500),
  creditor: z.string().max(500).optional().nullable(),
  principal: z.number(),
  balance: z.number(),
  interest_rate: z.number().min(0).max(100).optional().nullable(),
  min_payment: z.number().min(0).optional().nullable(),
  due_day: z.number().int().min(1).max(31).optional().nullable(),
  currency: z.string().max(10).optional(),
  status: z.string().max(50).optional(),
  notes: z.string().max(10000).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export const updateDebtSchema = createDebtSchema.partial().extend({
  id: z.string().uuid(),
});

// ── Crypto Balances ───────────────────────────────────────

export const createCryptoBalanceSchema = z.object({
  symbol: z.string().min(1).max(20),
  name: z.string().max(200).optional().nullable(),
  amount: z.number(),
  wallet: z.string().max(200).optional().nullable(),
  network: z.string().max(100).optional().nullable(),
  cost_basis_usd: z.number().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export const updateCryptoBalanceSchema = createCryptoBalanceSchema.partial().extend({
  id: z.string().uuid(),
});

// ── Scheduled Flows ───────────────────────────────────────

export const createScheduledFlowSchema = z.object({
  name: z.string().min(1).max(500),
  amount: z.number(),
  currency: z.string().max(10).optional(),
  direction: z.enum(["inflow", "outflow"]),
  frequency: z.string().max(50),
  day_of_month: z.number().int().min(1).max(31).optional().nullable(),
  category: z.string().max(200).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  active: z.boolean().optional(),
  project_id: z.string().uuid().optional().nullable(),
});

export const updateScheduledFlowSchema = createScheduledFlowSchema.partial().extend({
  id: z.string().uuid(),
});

// ── Forecast Runs ─────────────────────────────────────────

export const createForecastRunSchema = z.object({
  name: z.string().min(1).max(500),
  start_balance: z.number(),
  horizon_months: z.number().int().min(1).max(120),
  currency: z.string().max(10).optional(),
  is_preset: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export const updateForecastRunSchema = createForecastRunSchema.partial().extend({
  id: z.string().uuid(),
});

// ── Balance Snapshots ─────────────────────────────────────

export const createBalanceSnapshotSchema = z.object({
  wallet: z.string().min(1).max(200),
  balance: z.number(),
  currency: z.string().max(10).optional(),
  snapshot_date: z.string().max(50),
  project_id: z.string().uuid().optional().nullable(),
});

// ── Reimbursements ────────────────────────────────────────

export const createReimbursementRequestSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  total_amount: z.number(),
  currency: z.string().max(10).optional(),
  status: z.string().max(50).optional(),
  submitted_by: z.string().max(200).optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  items: z.array(z.object({
    description: z.string().max(1000),
    amount: z.number(),
    category: z.string().max(200).optional().nullable(),
    expense_date: z.string().max(50).optional().nullable(),
    receipt_url: z.string().url().optional().nullable(),
    user_id: z.string().uuid().optional().nullable(),
  })).optional(),
});

export const updateReimbursementRequestSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  total_amount: z.number().optional(),
  status: z.string().max(50).optional(),
  submitted_at: z.string().datetime().optional().nullable(),
  approved_at: z.string().datetime().optional().nullable(),
  paid_at: z.string().datetime().optional().nullable(),
});

// ── Reimbursement Payments ────────────────────────────────

export const createReimbursementPaymentSchema = z.object({
  amount: z.number(),
  currency: z.string().max(10).optional(),
  payment_date: z.string().max(50),
  method: z.string().max(100).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export const updateReimbursementPaymentSchema = createReimbursementPaymentSchema.partial().extend({
  id: z.string().uuid(),
});

// ── Reimbursement Allocations ─────────────────────────────

export const createReimbursementAllocationSchema = z.object({
  payment_id: z.string().uuid(),
  request_id: z.string().uuid(),
  amount: z.number(),
});

// ── Plaid ─────────────────────────────────────────────────

export const plaidExchangeSchema = z.object({
  public_token: z.string().min(1),
  institution_name: z.string().max(500).optional(),
});

export const plaidDisconnectSchema = z.object({
  item_id: z.string().uuid(),
});

// ── Personize ─────────────────────────────────────────────

export const memorizeSchema = z.object({
  content: z.string().min(1).max(50000),
  tags: z.array(z.string().max(100)).optional(),
  collectionId: z.string().max(200).optional(),
});

export const syncStatsSchema = z.object({
  projectId: z.string().uuid(),
});

// ── Forecast Compute ──────────────────────────────────────

export const forecastComputeSchema = z.object({
  runId: z.string().uuid().optional(),
});

// ── Pipeline Items ───────────────────────────────────────

export const createPipelineItemSchema = z.object({
  title: z.string().min(1).max(500),
  pipeline_id: z.string().uuid(),
  stage_id: z.string().uuid(),
  project_id: z.string().uuid(),
  entity_type: z.string().max(100).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updatePipelineItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  stage_id: z.string().uuid().optional(),
  sort_order: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// ── Events ──────────────────────────────────────────────

export const createEventSchema = z.object({
  name: z.string().min(1).max(500),
  project_id: z.string().uuid().optional().nullable(),
  date: z.string().max(50).optional().nullable(),
  location: z.string().max(1000).optional().nullable(),
  status: z.enum(["planning", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
  budget_target: z.number().min(0).optional(),
  participant_target: z.number().int().min(0).optional(),
});

export const updateEventSchema = createEventSchema.partial().extend({
  id: z.string().uuid(),
});

// ── Sponsors ─────────────────────────────────────────────

export const createSponsorSchema = z.object({
  name: z.string().min(1).max(500),
  contact_name: z.string().max(500).optional().nullable(),
  contact_email: z.string().email().max(500).optional().nullable(),
  company_url: z.string().max(1000).optional().nullable(),
  tier: z.enum(["bronze", "silver", "gold", "platinum", "title"]).optional(),
  status: z.enum(["not_contacted", "contacted", "negotiating", "confirmed", "declined"]).optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().max(10).optional(),
  notes: z.string().max(10000).optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
});

export const updateSponsorSchema = createSponsorSchema.partial().extend({
  id: z.string().uuid(),
});

// ── Webhook Ingest: Contacts ─────────────────────────────

export const ingestContactSchema = z.object({
  name: z.string().min(1).max(500),
  email: z.string().email().max(500),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(500).optional().nullable(),
  role: z.string().max(500).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  tags: z.array(z.string().max(100)).optional().nullable(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

// ── Webhook Ingest: Conversations ────────────────────────

export const ingestConversationSchema = z.object({
  contact_email: z.string().email().max(500),
  summary: z.string().max(10000).optional().nullable(),
  channel: z.string().max(100).optional().nullable(),
  last_message_at: z.string().datetime().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

// ── Webhook Ingest: Tasks ────────────────────────────────

export const ingestTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(["todo", "in_progress", "done", "blocked"]).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  due_date: z.string().datetime().optional().nullable(),
  assignee: z.string().max(200).optional().nullable(),
  tags: z.array(z.string().max(100)).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

// ── Webhook Ingest: Transactions ─────────────────────────

export const ingestTransactionSchema = z.object({
  date: z.string().max(50),
  description: z.string().max(1000),
  amount: z.number(),
  currency: z.string().max(10).optional(),
  category: z.string().max(200).optional().nullable(),
  wallet: z.string().max(200).optional().nullable(),
  type: z.string().max(50).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

// ── UUID param helper ─────────────────────────────────────

export const uuidParam = z.string().uuid();

// ── Generic ID-in-query helper ────────────────────────────

export function validateIdParam(id: string | null): id is string {
  return id !== null && uuidParam.safeParse(id).success;
}
