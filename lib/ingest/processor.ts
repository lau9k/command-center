import "server-only";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { logActivity } from "@/lib/activity-logger";
import { logSync } from "@/lib/gmail-sync-log";
import { scoreTask } from "@/lib/task-scoring";
import type { Task, IngestEvent } from "@/lib/types/database";

type EntityType = "contact" | "conversation" | "task" | "transaction";

// ── Processor-level Zod schemas ─────────────────────────
// These validate the MINIMUM required fields before upsert,
// catching data quality issues that would otherwise surface
// as cryptic Supabase constraint violations.

const processorContactSchema = z
  .object({
    name: z.string().min(1).nullish(),
    email: z.string().email().nullish(),
  })
  .passthrough()
  .refine((d) => (d.name && d.name.length > 0) || (d.email && d.email.length > 0), {
    message: "Contact must have at least a name or an email",
  });

const processorConversationSchema = z
  .object({
    external_id: z.string().min(1).nullish(),
    contact_email: z.string().email().nullish(),
    channel: z.string().max(100).nullish(),
  })
  .passthrough()
  .refine((d) => (d.external_id && d.external_id.length > 0) || (d.contact_email && d.contact_email.length > 0), {
    message: "Conversation must have at least an external_id or a contact_email",
  });

const processorTaskSchema = z
  .object({
    title: z.string().min(1, "Task must have a title"),
  })
  .passthrough();

const processorTransactionSchema = z
  .object({
    amount: z.number({ error: "Transaction must have an amount" }),
    date: z.string().min(1).nullish(),
    due_day: z.number().nullish(),
  })
  .passthrough()
  .refine((d) => (d.date && d.date.length > 0) || (d.due_day != null), {
    message: "Transaction must have a date or due_day",
  });

const PROCESSOR_SCHEMAS: Record<EntityType, z.ZodType> = {
  contact: processorContactSchema,
  conversation: processorConversationSchema,
  task: processorTaskSchema,
  transaction: processorTransactionSchema,
};

/**
 * Validate items with the processor-level schema.
 * Returns { valid, invalid } arrays. Invalid items are logged and
 * recorded in ingest_events with status "validation_failed".
 */
async function validateItems<T>(
  supabase: ReturnType<typeof createServiceClient>,
  entityType: EntityType,
  items: Record<string, unknown>[],
): Promise<{ valid: T[]; invalidCount: number }> {
  const schema = PROCESSOR_SCHEMAS[entityType];
  const valid: T[] = [];
  let invalidCount = 0;

  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(result.data as T);
    } else {
      invalidCount++;
      const errorMsg = result.error.issues.map((e: { message: string }) => e.message).join("; ");
      const fieldErrors = result.error.issues.map((e) =>
        `${e.path.map(String).join(".")}: ${e.message}`
      ).join("; ");
      const keys = Object.keys(item).join(", ");
      console.error(
        `[ingest:${entityType}] Validation failed: ${errorMsg} — payload keys: ${keys}`
      );
      void logSync(
        `n8n:${entityType}`,
        "error",
        0,
        `Validation failed: ${fieldErrors}`,
        { records_found: 1, records_skipped: 1 }
      );
      // Record the failure in ingest_events for observability
      void supabase.from("ingest_events").insert({
        entity_type: entityType,
        status: "validation_failed",
        payload: item,
        metadata: { validation_errors: result.error.issues },
      });
    }
  }

  return { valid, invalidCount };
}

interface ProcessResult {
  processed: number;
  failed: number;
  validation_failures: number;
  remaining: number;
}

// ── Individual event processor ──────────────────────────

const CONTACT_COLUMNS = [
  "name",
  "email",
  "phone",
  "company",
  "role",
  "source",
  "qualified_status",
  "slack_user_id",
  "telegram_id",
  "linkedin_url",
  "last_contact_date",
  "next_action",
  "metadata",
  "tags",
  "score",
  "notes",
  "project_id",
  "user_id",
] as const;

const CONVERSATION_COLUMNS = [
  "external_id",
  "contact_id",
  "contact_email",
  "summary",
  "channel",
  "platform",
  "subject",
  "first_message_at",
  "last_message_at",
  "metadata",
  "project_id",
  "user_id",
  "status",
  "snippet",
  "thread_id",
  "message_count",
  "label_ids",
  "gmail_history_id",
] as const;

async function processContactPayload(
  supabase: ReturnType<typeof createServiceClient>,
  payload: IngestEvent["payload"]
): Promise<{ invalidCount: number }> {
  const items = Array.isArray(payload) ? payload : [payload];

  // Validate items before processing
  const { valid, invalidCount } = await validateItems<Record<string, unknown>>(
    supabase, "contact", items as Record<string, unknown>[],
  );
  if (valid.length === 0) {
    throw new Error(`All ${invalidCount} contact item(s) failed validation`);
  }

  // Inject required defaults for webhook-ingested contacts.
  // The contacts table requires project_id (NOT NULL) and user_id (NOT NULL),
  // but n8n payloads may omit these. Fall back to the default project/user.
  const DEFAULT_PROJECT_ID =
    process.env.DEFAULT_PROJECT_ID ?? "9c5926fc-6f96-42c5-b1ee-2e69cd3ca2ae";
  const DEFAULT_USER_ID =
    process.env.DEFAULT_USER_ID ?? "de054c30-3eb0-4ffd-a661-200f4c2d5cf6";

  const allowedSet = new Set<string>(CONTACT_COLUMNS);
  const rows = valid.map((item) => {
    const picked: Record<string, unknown> = {};
    const stripped: string[] = [];
    for (const key of Object.keys(item)) {
      if (allowedSet.has(key)) {
        picked[key] = item[key];
      } else {
        stripped.push(key);
      }
    }
    if (stripped.length > 0) {
      console.warn(
        `[ingest:contact] Stripped unknown columns: ${stripped.join(", ")}`
      );
    }
    picked.project_id = (item.project_id as string) || DEFAULT_PROJECT_ID;
    picked.user_id = (item.user_id as string) || DEFAULT_USER_ID;
    return picked;
  });

  // Split rows by available identifier for correct upsert conflict target
  const emailRows = rows.filter((r) => r.email);
  const linkedinOnlyRows = rows.filter((r) => !r.email && r.linkedin_url);

  const results: Record<string, unknown>[] = [];

  if (emailRows.length > 0) {
    const { data, error } = await supabase
      .from("contacts")
      .upsert(emailRows, { onConflict: "email" })
      .select();
    if (error) {
      void logSync("n8n:contacts", "error", 0, error.message, { records_found: rows.length, records_skipped: rows.length });
      throw new Error(error.message);
    }
    results.push(...(data ?? []));
  }

  if (linkedinOnlyRows.length > 0) {
    const { data, error } = await supabase
      .from("contacts")
      .upsert(linkedinOnlyRows, { onConflict: "linkedin_url" })
      .select();
    if (error) {
      void logSync("n8n:contacts", "error", 0, error.message, { records_found: rows.length, records_skipped: rows.length });
      throw new Error(error.message);
    }
    results.push(...(data ?? []));
  }

  for (const row of results) {
    void logActivity({
      action: "ingested",
      entity_type: "contact",
      entity_id: row.id as string,
      entity_name: row.name as string,
      source: "n8n",
    });
  }
  void logSync("n8n:contacts", "success", results.length, undefined, { records_found: items.length, records_skipped: invalidCount });
  return { invalidCount };
}

async function processConversationPayload(
  supabase: ReturnType<typeof createServiceClient>,
  payload: IngestEvent["payload"]
): Promise<{ invalidCount: number }> {
  const items = Array.isArray(payload) ? payload : [payload];

  // Validate items before processing
  const { valid, invalidCount } = await validateItems<Record<string, unknown>>(
    supabase, "conversation", items as Record<string, unknown>[],
  );
  if (valid.length === 0) {
    throw new Error(`All ${invalidCount} conversation item(s) failed validation`);
  }

  // Inject required defaults for webhook-ingested conversations.
  // The conversations table requires user_id (NOT NULL) and channel (NOT NULL in production),
  // but n8n payloads may omit these. Fall back to sensible defaults.
  const DEFAULT_USER_ID =
    process.env.DEFAULT_USER_ID ?? "de054c30-3eb0-4ffd-a661-200f4c2d5cf6";

  // Batch-lookup contacts by email
  const emails = [
    ...new Set(
      valid.map((c) => c.contact_email as string).filter(Boolean)
    ),
  ];
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, email")
    .in("email", emails);

  const emailToId = new Map<string, string>();
  for (const c of contacts ?? []) {
    if (c.email) emailToId.set(c.email, c.id);
  }

  const allowedConvSet = new Set<string>(CONVERSATION_COLUMNS);

  // Build upsert rows with contact_id resolved + required defaults injected
  const rows = valid.map((item) => {
    const contactEmail = item.contact_email as string | undefined;
    const cleaned: Record<string, unknown> = {};
    const stripped: string[] = [];
    for (const [key, value] of Object.entries(item)) {
      if (key === "contact_email") continue;
      if (allowedConvSet.has(key)) {
        cleaned[key] = value;
      } else {
        stripped.push(key);
      }
    }
    if (stripped.length > 0) {
      console.warn(
        `[ingest:conversation] Stripped unknown columns: ${stripped.join(", ")}`
      );
    }
    cleaned.contact_id = (contactEmail ? emailToId.get(contactEmail) : null) ?? null;
    cleaned.user_id = (cleaned.user_id as string) || DEFAULT_USER_ID;
    cleaned.channel = (cleaned.channel as string) || "unknown";
    return cleaned;
  });

  const { data, error } = await supabase
    .from("conversations")
    .upsert(rows, { onConflict: "external_id" })
    .select();

  if (error) {
    void logSync("n8n:conversations", "error", 0, error.message, { records_found: rows.length, records_skipped: rows.length });
    throw new Error(error.message);
  }

  const results = data ?? [];
  for (const row of results) {
    void logActivity({
      action: "ingested",
      entity_type: "conversation",
      entity_id: row.id,
      entity_name: row.summary,
      source: "n8n",
    });
  }
  void logSync("n8n:conversations", "success", results.length, undefined, { records_found: items.length, records_skipped: invalidCount });
  return { invalidCount };
}

async function processTaskPayload(
  supabase: ReturnType<typeof createServiceClient>,
  payload: IngestEvent["payload"]
): Promise<{ invalidCount: number }> {
  const items = Array.isArray(payload) ? payload : [payload];

  // Validate items before processing
  const { valid, invalidCount } = await validateItems<Record<string, unknown>>(
    supabase, "task", items as Record<string, unknown>[],
  );
  if (valid.length === 0) {
    throw new Error(`All ${invalidCount} task item(s) failed validation`);
  }

  // Inject required defaults for webhook-ingested tasks.
  // The tasks table requires project_id (NOT NULL) and user_id (NOT NULL),
  // but n8n payloads may omit these. Fall back to the default project/user.
  const DEFAULT_PROJECT_ID =
    process.env.DEFAULT_PROJECT_ID ?? "9c5926fc-6f96-42c5-b1ee-2e69cd3ca2ae";
  const DEFAULT_USER_ID =
    process.env.DEFAULT_USER_ID ?? "de054c30-3eb0-4ffd-a661-200f4c2d5cf6";

  // Collect unique project IDs to batch-fetch names
  const projectIds = [
    ...new Set(valid.map((t) => t.project_id as string).filter(Boolean)),
  ];
  const projectMap = new Map<string, { name: string }>();

  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    for (const p of projects ?? []) {
      projectMap.set(p.id, { name: p.name });
    }
  }

  // Whitelist allowed task columns to prevent unknown fields from
  // reaching PostgREST (same pattern as contact processor).
  const TASK_COLUMNS = new Set([
    "external_id",
    "title",
    "description",
    "status",
    "priority",
    "due_date",
    "assignee",
    "tags",
    "project_id",
    "user_id",
    "priority_score",
    "recurrence_rule",
    "recurrence_parent_id",
    "is_recurring_template",
  ]);

  // Score each task and prepare upsert rows
  const rows = valid.map((item) => {
    const taskForScoring: Task = {
      id: "",
      external_id: item.external_id as string | undefined,
      title: item.title as string,
      description: (item.description as string) ?? null,
      status: (item.status as Task["status"]) ?? "todo",
      priority: (item.priority as Task["priority"]) ?? "medium",
      due_date: (item.due_date as string) ?? null,
      assignee: (item.assignee as string) ?? null,
      tags: (item.tags as string[]) ?? null,
      project_id: (item.project_id as string) ?? null,
      recurrence_rule: null,
      recurrence_parent_id: null,
      is_recurring_template: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const project = item.project_id
      ? projectMap.get(item.project_id as string) ?? null
      : null;
    const { score } = scoreTask(taskForScoring, project);

    // Strip unknown fields — only keep columns that exist in the tasks table
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (TASK_COLUMNS.has(key)) {
        cleaned[key] = value;
      }
    }
    cleaned.priority_score = score;
    cleaned.project_id = (item.project_id as string) || DEFAULT_PROJECT_ID;
    cleaned.user_id = (item.user_id as string) || DEFAULT_USER_ID;
    return cleaned;
  });

  const { data, error } = await supabase
    .from("tasks")
    .upsert(rows, { onConflict: "external_id" })
    .select();

  if (error) {
    void logSync("n8n:tasks", "error", 0, error.message, { records_found: rows.length, records_skipped: rows.length });
    throw new Error(error.message);
  }

  const results = data ?? [];
  for (const row of results) {
    void logActivity({
      action: "ingested",
      entity_type: "task",
      entity_id: row.id,
      entity_name: row.title,
      source: "n8n",
    });
  }
  void logSync("n8n:tasks", "success", results.length, undefined, { records_found: items.length, records_skipped: invalidCount });
  return { invalidCount };
}

async function processTransactionPayload(
  supabase: ReturnType<typeof createServiceClient>,
  payload: IngestEvent["payload"]
): Promise<{ invalidCount: number }> {
  const items = Array.isArray(payload) ? payload : [payload];

  // Validate items before processing
  const { valid, invalidCount } = await validateItems<Record<string, unknown>>(
    supabase, "transaction", items as Record<string, unknown>[],
  );
  if (valid.length === 0) {
    throw new Error(`All ${invalidCount} transaction item(s) failed validation`);
  }

  // Inject required defaults for webhook-ingested transactions.
  // The transactions table requires user_id (NOT NULL).
  const DEFAULT_USER_ID =
    process.env.DEFAULT_USER_ID ?? "de054c30-3eb0-4ffd-a661-200f4c2d5cf6";

  // Whitelist allowed transaction columns to prevent unknown fields from
  // reaching PostgREST (same pattern as contact processor).
  const TRANSACTION_COLUMNS = new Set([
    "external_id",
    "name",
    "amount",
    "type",
    "category",
    "interval",
    "due_day",
    "user_id",
    "account_id",
    "date",
    "merchant_name",
    "payment_channel",
    "pending",
    "iso_currency_code",
    "plaid_transaction_id",
  ]);

  const enriched = valid.map((item) => {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (TRANSACTION_COLUMNS.has(key)) {
        cleaned[key] = value;
      }
    }
    cleaned.user_id = (cleaned.user_id as string) || DEFAULT_USER_ID;
    return cleaned;
  });

  const { data, error } = await supabase
    .from("transactions")
    .upsert(enriched, { onConflict: "external_id" })
    .select();

  if (error) {
    void logSync("n8n:transactions", "error", 0, error.message, { records_found: enriched.length, records_skipped: enriched.length });
    throw new Error(error.message);
  }

  const results = data ?? [];
  for (const row of results) {
    void logActivity({
      action: "ingested",
      entity_type: "transaction",
      entity_id: row.id,
      entity_name: row.name,
      source: "n8n",
    });
  }
  void logSync("n8n:transactions", "success", results.length, undefined, { records_found: items.length, records_skipped: invalidCount });
  return { invalidCount };
}

// ── Main entry points ───────────────────────────────────

const ENTITY_PROCESSORS: Record<
  EntityType,
  (
    supabase: ReturnType<typeof createServiceClient>,
    payload: IngestEvent["payload"]
  ) => Promise<{ invalidCount: number }>
> = {
  contact: processContactPayload,
  conversation: processConversationPayload,
  task: processTaskPayload,
  transaction: processTransactionPayload,
};

const WORKER_ID = "vercel-cron";

async function markClaimedEventProcessed(
  supabase: ReturnType<typeof createServiceClient>,
  eventId: string
): Promise<void> {
  const { data: updated, error } = await supabase.rpc("complete_ingest_event", {
    p_event_id: eventId,
    p_worker_id: WORKER_ID,
  });

  if (error) {
    console.error("[processor] Failed to mark event processed:", error.message);
  } else if (!updated) {
    console.warn(`[processor] Ownership lost for event ${eventId} — skipping completion`);
  }
}

async function markClaimedEventFailed(
  supabase: ReturnType<typeof createServiceClient>,
  eventId: string,
  attempt: number,
  errorMessage: string
): Promise<void> {
  const { data: updated, error } = await supabase.rpc("fail_ingest_event", {
    p_event_id: eventId,
    p_worker_id: WORKER_ID,
    p_attempt_count: attempt + 1,
    p_error_message: errorMessage,
  });

  if (error) {
    console.error("[processor] Failed to mark event failed:", error.message);
  } else if (!updated) {
    console.warn(`[processor] Ownership lost for event ${eventId} — skipping failure mark`);
  }
}

export async function processUnprocessedEvents(): Promise<ProcessResult> {
  const supabase = createServiceClient();

  // Claim a batch of events via RPC
  const { data: events, error } = await supabase.rpc("claim_ingest_events", {
    p_limit: 25,
    p_worker_id: WORKER_ID,
  });

  if (error) throw new Error(`Failed to claim events: ${error.message}`);

  const claimed = (events ?? []) as IngestEvent[];
  if (claimed.length === 0) {
    return { processed: 0, failed: 0, validation_failures: 0, remaining: 0 };
  }

  let processed = 0;
  let failed = 0;
  let validationFailures = 0;

  for (const event of claimed) {
    try {
      const processor = ENTITY_PROCESSORS[event.entity_type as EntityType];
      if (!processor) {
        throw new Error(`Unknown entity_type: ${event.entity_type}`);
      }

      let result: { invalidCount: number };
      try {
        result = await processor(supabase, event.payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("schema cache")) {
          console.warn(
            `[processor] Schema cache error for event ${event.id}, retrying in 1s...`
          );
          void logSync(
            `n8n:${event.entity_type}`,
            "error",
            0,
            `Schema cache retry (attempt ${event.attempt_count + 1}): ${message}`,
            { records_found: 0, records_skipped: 0 }
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          result = await processor(supabase, event.payload);
        } else {
          throw err;
        }
      }

      validationFailures += result.invalidCount;
      await markClaimedEventProcessed(supabase, event.id);
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markClaimedEventFailed(supabase, event.id, event.attempt_count, message);
      failed++;
    }
  }

  // Count remaining
  const { count } = await supabase
    .from("ingest_events")
    .select("id", { count: "exact", head: true })
    .in("status", ["received", "retryable"]);

  return { processed, failed, validation_failures: validationFailures, remaining: count ?? 0 };
}
