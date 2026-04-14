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
  checked_in_at: z.string().datetime().optional().nullable(),
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
  assignee: z.string().max(200).optional().nullable(),
  recurrence_rule: z.enum(["daily", "weekly", "monthly"]).optional().nullable(),
  is_recurring_template: z.boolean().optional(),
  contact_id: z.string().uuid().optional().nullable(),
  task_type: z.enum(["general", "outreach", "follow-up", "meeting-prep"]).optional(),
  external_url: z.string().url().max(2000).optional().nullable(),
  outreach_status: z.enum(["queued", "sent", "replied", "no_response", "skipped"]).optional(),
  sent_at: z.string().datetime().optional().nullable(),
  response_notes: z.string().max(10000).optional().nullable(),
  tags: z.array(z.string().max(100)).optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

// ── Batch Outreach Status ────────────────────────────────

export const batchOutreachStatusSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1, "At least one task ID is required"),
  outreach_status: z.enum(["queued", "sent", "replied", "no_response", "skipped"]),
  sent_at: z.string().datetime().optional().nullable(),
});

// ── Content Posts ─────────────────────────────────────────

export const createContentPostSchema = z.object({
  title: z.string().min(1).max(500),
  body: z.string().max(50000).optional().nullable(),
  caption: z.string().max(5000).optional().nullable(),
  platform: z.string().max(100).optional().nullable().default("linkedin"),
  status: z.string().max(50).optional(),
  scheduled_for: z.string().datetime().optional().nullable(),
  published_at: z.string().datetime().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  media_urls: z.array(z.string().url()).optional().nullable(),
  buffer_profile_ids: z.array(z.string()).optional().nullable(),
  buffer_id: z.string().max(200).optional().nullable(),
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

export const zernioPublishSchema = z.object({
  content_post_id: z.string().uuid(),
  platforms: z.array(z.string().min(1)).min(1, "Select at least one platform"),
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
  outreach_status: z.enum(["draft", "sent", "replied", "converted"]).optional(),
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
  email: z.string().email().max(500).optional().nullable(),
  linkedin_url: z.string().url().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(500).optional().nullable(),
  role: z.string().max(500).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  tags: z.array(z.string().max(100)).optional().nullable(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  qualified_status: z.string().max(100).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
}).superRefine((data, ctx) => {
  if (!data.email && !data.linkedin_url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "email or linkedin_url required",
    });
  }
});

// ── Webhook Ingest: Conversations ────────────────────────

export const ingestConversationSchema = z.object({
  external_id: z.string().max(500),
  contact_email: z.union([
    z.string().email().max(500),
    z.literal(""),
  ]).optional().nullable(),
  summary: z.string().max(10000).optional().nullable(),
  channel: z.string().max(100).optional().nullable(),
  last_message_at: z.string().datetime().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

// ── Webhook Ingest: Tasks ────────────────────────────────

export const ingestTaskSchema = z.object({
  external_id: z.string().max(500),
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
  external_id: z.string().max(500),
  name: z.string().min(1).max(1000),
  amount: z.number(),
  type: z.enum(["expense", "income"]).default("expense"),
  category: z.string().max(200).optional().nullable(),
  interval: z.enum(["monthly", "biweekly", "weekly", "one_time"]).default("one_time"),
  due_day: z.number().int().min(1).max(31).optional().nullable(),
  start_date: z.string().max(50).optional().nullable(),
  end_date: z.string().max(50).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

// ── Community Events ─────────────────────────────────────

export const createCommunityEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional().nullable(),
  event_type: z.enum(["new_member", "token_transfer", "social_mention"]),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// ── Email Templates ──────────────────────────────────────

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1).max(500),
  subject: z.string().max(2000).optional(),
  body: z.string().max(50000).optional(),
  variables: z.array(z.string().max(100)).optional(),
  category: z.enum(["general", "outreach", "follow_up", "introduction", "proposal", "thank_you"]).optional(),
});

export const updateEmailTemplateSchema = createEmailTemplateSchema.partial();

// ── Notifications ────────────────────────────────────────

export const createNotificationSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  body: z.string().max(5000).optional().nullable(),
  type: z.enum(["task", "alert", "info", "signal"]),
  project_id: z.string().uuid().optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  action_url: z.string().max(2000).optional().nullable(),
});

// ── Saved Views ──────────────────────────────────────────

const filterConditionSchema = z.object({
  field: z.string().min(1).max(200),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "ilike", "in", "is_null", "is_not_null"]),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
  ]),
});

export const createSavedViewSchema = z.object({
  name: z.string().min(1).max(200),
  entity_type: z.enum(["contacts", "tasks", "pipeline_items", "content_posts", "transactions", "sponsors"]),
  filters: z.array(filterConditionSchema).max(20).default([]),
  sort_by: z.string().max(200).optional().nullable(),
  sort_direction: z.enum(["asc", "desc"]).optional().default("asc"),
  is_default: z.boolean().optional().default(false),
});

export const updateSavedViewSchema = createSavedViewSchema.partial();

// ── AI Context Cache ─────────────────────────────────────

export const aiCacheGetSchema = z.object({
  user_id: z.string().uuid(),
  view_type: z.string().min(1).max(100),
  scope_id: z.string().max(200).optional().nullable(),
  model_mode: z.enum(["fast", "full"]),
  input_hash: z.string().max(128).optional().nullable(),
});

export const aiCachePostSchema = z.object({
  user_id: z.string().uuid(),
  view_type: z.string().min(1).max(100),
  scope_id: z.string().max(200).optional().nullable(),
  model_mode: z.enum(["fast", "full"]),
  input_hash: z.string().min(1).max(128),
  content: z.record(z.string(), z.unknown()),
  token_cost: z.number().int().min(0),
  ttl_minutes: z.number().int().min(1).max(10080).optional(),
});

// ── AI Token Budget ──────────────────────────────────────

const aiFeatureEnum = z.enum([
  "daily_brief",
  "task_priorities",
  "contact_summary",
  "pipeline_summary",
  "suggestions",
]);

export const aiBudgetCheckSchema = z.object({
  feature: aiFeatureEnum,
  estimated_cost: z.number().int().min(0),
});

export const aiBudgetRecordSchema = z.object({
  feature: aiFeatureEnum,
  tokens_used: z.number().int().min(1),
});

// ── Batch Memorize ───────────────────────────────────────

const batchMemorizeRowSchema = z
  .object({
    email: z.string().email().max(500).optional(),
    name: z.string().max(500).optional(),
    first_name: z.string().max(500).optional(),
    last_name: z.string().max(500).optional(),
    company: z.string().max(500).optional(),
    title: z.string().max(500).optional(),
    job_title: z.string().max(500).optional(),
    company_name: z.string().max(500).optional(),
    linkedin_url: z.string().max(2000).optional(),
    website: z.string().max(2000).optional(),
    phone: z.string().max(50).optional(),
    industry: z.string().max(500).optional(),
    city: z.string().max(500).optional(),
    country: z.string().max(500).optional(),
    notes: z.string().max(10000).optional(),
    source: z.string().max(200).optional(),
  })
  .refine((row) => Boolean(row.email || row.name || row.first_name), {
    message: "Each row must have at least an email, name, or first_name",
  });

export const batchMemorizeSchema = z.object({
  source: z.string().min(1, "source is required").max(200),
  rows: z
    .array(batchMemorizeRowSchema)
    .min(1, "At least one row is required")
    .max(500, "Maximum 500 rows per request"),
});

// ── Context Docs ─────────────────────────────────────────

export const contextDocTypeEnum = z.enum([
  "guideline",
  "playbook",
  "reference",
  "template",
  "brief",
]);

export const saveContextDocSchema = z.object({
  id: z.string().max(200).optional(),
  type: contextDocTypeEnum,
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100000),
  tags: z.array(z.string().max(100)).max(50).optional(),
});

// ── UUID param helper ─────────────────────────────────────

export const uuidParam = z.string().uuid();

// ── Generic ID-in-query helper ────────────────────────────

export function validateIdParam(id: string | null): id is string {
  return id !== null && uuidParam.safeParse(id).success;
}
