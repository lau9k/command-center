import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { logActivity } from "@/lib/activity-logger";
import { logSync } from "@/lib/gmail-sync-log";
import { scoreTask } from "@/lib/task-scoring";
import type { Task, IngestEvent, IngestEventStatus } from "@/lib/types/database";

type EntityType = "contact" | "conversation" | "task" | "transaction";

interface ProcessResult {
  processed: number;
  failed: number;
  remaining: number;
}

// ── Individual event processor ──────────────────────────

async function processContactPayload(
  supabase: ReturnType<typeof createServiceClient>,
  payload: IngestEvent["payload"]
) {
  const items = Array.isArray(payload) ? payload : [payload];

  const { data, error } = await supabase
    .from("contacts")
    .upsert(items, { onConflict: "email" })
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

  // Build upsert rows with contact_id resolved
  const rows = items.map(({ contact_email, ...rest }) => ({
    ...rest,
    contact_id: emailToId.get(contact_email as string) ?? null,
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

    return { ...item, priority_score: score };
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

  const { data, error } = await supabase
    .from("transactions")
    .upsert(items, { onConflict: "external_id" })
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

// ── Backoff schedule (attempt → seconds) ─────────────────
const BACKOFF_SECONDS = [30, 120, 600, 1800, 3600] as const;

function computeNextRetryAt(attempt: number): string {
  const delaySec = BACKOFF_SECONDS[Math.min(attempt, BACKOFF_SECONDS.length - 1)];
  return new Date(Date.now() + delaySec * 1000).toISOString();
}

const MAX_ATTEMPTS = 5;

async function markClaimedEventProcessed(
  supabase: ReturnType<typeof createServiceClient>,
  eventId: string
): Promise<void> {
  const { error } = await supabase
    .from("ingest_events")
    .update({
      status: "processed" as IngestEventStatus,
      claimed_at: null,
      lease_expires_at: null,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    console.error("[processor] Failed to mark event processed:", error.message);
  }
}

async function markClaimedEventFailed(
  supabase: ReturnType<typeof createServiceClient>,
  eventId: string,
  attempt: number,
  errorMessage: string
): Promise<void> {
  const isDead = attempt >= MAX_ATTEMPTS;
  const { error } = await supabase
    .from("ingest_events")
    .update({
      status: (isDead ? "dead_letter" : "retryable") as IngestEventStatus,
      last_failed_at: new Date().toISOString(),
      last_error_code: errorMessage.slice(0, 255),
      next_retry_at: isDead ? null : computeNextRetryAt(attempt),
      claimed_at: null,
      lease_expires_at: null,
      attempt_count: attempt + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    console.error("[processor] Failed to mark event failed:", error.message);
  }
}

export async function processUnprocessedEvents(): Promise<ProcessResult> {
  const supabase = createServiceClient();

  // Claim a batch of events via RPC
  const { data: events, error } = await supabase.rpc("claim_ingest_events", {
    p_limit: 25,
    p_worker_id: "vercel-cron",
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
