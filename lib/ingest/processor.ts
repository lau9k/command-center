import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { logActivity } from "@/lib/activity-logger";
import { logSync } from "@/lib/gmail-sync-log";
import { scoreTask } from "@/lib/task-scoring";
import type { Task, IngestEvent } from "@/lib/types/database";

type EntityType = "contact" | "conversation" | "task" | "transaction";

interface ProcessResult {
  processed: number;
  failed: number;
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
  "project_id",
  "user_id",
] as const;

async function processContactPayload(
  supabase: ReturnType<typeof createServiceClient>,
  payload: IngestEvent["payload"]
) {
  const items = Array.isArray(payload) ? payload : [payload];

  // Inject required defaults for webhook-ingested contacts.
  // The contacts table requires project_id (NOT NULL) and user_id (NOT NULL),
  // but n8n payloads may omit these. Fall back to the default project/user.
  const DEFAULT_PROJECT_ID =
    process.env.DEFAULT_PROJECT_ID ?? "9c5926fc-6f96-42c5-b1ee-2e69cd3ca2ae";
  const DEFAULT_USER_ID =
    process.env.DEFAULT_USER_ID ?? "de054c30-3eb0-4ffd-a661-200f4c2d5cf6";

  const rows = items.map((item) => {
    const picked: Record<string, unknown> = {};
    for (const col of CONTACT_COLUMNS) {
      if ((item as Record<string, unknown>)[col] !== undefined) {
        picked[col] = (item as Record<string, unknown>)[col];
      }
    }
    picked.project_id = (item.project_id as string) || DEFAULT_PROJECT_ID;
    picked.user_id = (item.user_id as string) || DEFAULT_USER_ID;
    return picked;
  });

  const { data, error } = await supabase
    .from("contacts")
    .upsert(rows, { onConflict: "email" })
    .select();

  if (error) {
    void logSync("n8n:contacts", "error", 0, error.message);
    throw new Error(error.message);
  }

  const results = data ?? [];
  for (const row of results) {
    void logActivity({
      action: "ingested",
      entity_type: "contact",
      entity_id: row.id,
      entity_name: row.name,
      source: "n8n",
    });
  }
  void logSync("n8n:contacts", "success", results.length);
}

async function processConversationPayload(
  supabase: ReturnType<typeof createServiceClient>,
  payload: IngestEvent["payload"]
) {
  const items = Array.isArray(payload) ? payload : [payload];

  // Inject required defaults for webhook-ingested conversations.
  // The conversations table requires user_id (NOT NULL) and channel (NOT NULL in production),
  // but n8n payloads may omit these. Fall back to sensible defaults.
  const DEFAULT_USER_ID =
    process.env.DEFAULT_USER_ID ?? "de054c30-3eb0-4ffd-a661-200f4c2d5cf6";

  // Batch-lookup contacts by email
  const emails = [
    ...new Set(
      items.map((c) => c.contact_email as string).filter(Boolean)
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

  // Build upsert rows with contact_id resolved + required defaults injected
  const rows = items.map(({ contact_email, ...rest }) => ({
    ...rest,
    contact_id: emailToId.get(contact_email as string) ?? null,
    user_id: (rest.user_id as string) || DEFAULT_USER_ID,
    channel: (rest.channel as string) || "unknown",
  }));

  const { data, error } = await supabase
    .from("conversations")
    .upsert(rows, { onConflict: "external_id" })
    .select();

  if (error) {
    void logSync("n8n:conversations", "error", 0, error.message);
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
  void logSync("n8n:conversations", "success", results.length);
}

async function processTaskPayload(
  supabase: ReturnType<typeof createServiceClient>,
  payload: IngestEvent["payload"]
) {
  const items = Array.isArray(payload) ? payload : [payload];

  // Inject required defaults for webhook-ingested tasks.
  // The tasks table requires project_id (NOT NULL) and user_id (NOT NULL),
  // but n8n payloads may omit these. Fall back to the default project/user.
  const DEFAULT_PROJECT_ID =
    process.env.DEFAULT_PROJECT_ID ?? "9c5926fc-6f96-42c5-b1ee-2e69cd3ca2ae";
  const DEFAULT_USER_ID =
    process.env.DEFAULT_USER_ID ?? "de054c30-3eb0-4ffd-a661-200f4c2d5cf6";

  // Collect unique project IDs to batch-fetch names
  const projectIds = [
    ...new Set(items.map((t) => t.project_id as string).filter(Boolean)),
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

  // Score each task and prepare upsert rows
  const rows = items.map((item) => {
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

    return {
      ...item,
      priority_score: score,
      project_id: (item.project_id as string) || DEFAULT_PROJECT_ID,
      user_id: (item.user_id as string) || DEFAULT_USER_ID,
    };
  });

  const { data, error } = await supabase
    .from("tasks")
    .upsert(rows, { onConflict: "external_id" })
    .select();

  if (error) {
    void logSync("n8n:tasks", "error", 0, error.message);
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
  void logSync("n8n:tasks", "success", results.length);
}

async function processTransactionPayload(
  supabase: ReturnType<typeof createServiceClient>,
  payload: IngestEvent["payload"]
) {
  const items = Array.isArray(payload) ? payload : [payload];

  // Inject required defaults for webhook-ingested transactions.
  // The transactions table requires user_id (NOT NULL).
  const DEFAULT_USER_ID =
    process.env.DEFAULT_USER_ID ?? "de054c30-3eb0-4ffd-a661-200f4c2d5cf6";

  const enriched = items.map((item) => ({
    ...item,
    user_id: (item.user_id as string) || DEFAULT_USER_ID,
  }));

  const { data, error } = await supabase
    .from("transactions")
    .upsert(enriched, { onConflict: "external_id" })
    .select();

  if (error) {
    void logSync("n8n:transactions", "error", 0, error.message);
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
  void logSync("n8n:transactions", "success", results.length);
}

// ── Main entry points ───────────────────────────────────

const ENTITY_PROCESSORS: Record<
  EntityType,
  (
    supabase: ReturnType<typeof createServiceClient>,
    payload: IngestEvent["payload"]
  ) => Promise<void>
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
    return { processed: 0, failed: 0, remaining: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const event of claimed) {
    try {
      const processor = ENTITY_PROCESSORS[event.entity_type as EntityType];
      if (!processor) {
        throw new Error(`Unknown entity_type: ${event.entity_type}`);
      }

      await processor(supabase, event.payload);
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

  return { processed, failed, remaining: count ?? 0 };
}
