import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { logActivity } from "@/lib/activity-logger";
import { logSync } from "@/lib/gmail-sync-log";
import { scoreTask } from "@/lib/task-scoring";
import type { Task } from "@/lib/types/database";

interface IngestEvent {
  id: string;
  entity_type: "contact" | "conversation" | "task" | "transaction";
  payload: Record<string, unknown>;
  status: string;
}

interface ProcessResult {
  processed: number;
  failed: number;
  remaining: number;
}

// ── Individual event processor ──────────────────────────

async function processContactPayload(
  supabase: ReturnType<typeof createServiceClient>,
  items: Record<string, unknown>[]
) {
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
  items: Record<string, unknown>[]
) {
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
  items: Record<string, unknown>[]
) {
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
  items: Record<string, unknown>[]
) {
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
  IngestEvent["entity_type"],
  (
    supabase: ReturnType<typeof createServiceClient>,
    items: Record<string, unknown>[]
  ) => Promise<void>
> = {
  contact: processContactPayload,
  conversation: processConversationPayload,
  task: processTaskPayload,
  transaction: processTransactionPayload,
};

export async function processIngestEvent(eventId: string): Promise<void> {
  const supabase = createServiceClient();

  // Claim the event row with FOR UPDATE SKIP LOCKED
  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_ingest_event",
    { event_id: eventId }
  );

  if (claimError) throw new Error(`Failed to claim event: ${claimError.message}`);
  if (!claimed || (Array.isArray(claimed) && claimed.length === 0)) return;

  const event: IngestEvent = Array.isArray(claimed) ? claimed[0] : claimed;

  try {
    const processor = ENTITY_PROCESSORS[event.entity_type];
    if (!processor) {
      throw new Error(`Unknown entity_type: ${event.entity_type}`);
    }

    const items = Array.isArray(event.payload)
      ? (event.payload as Record<string, unknown>[])
      : [event.payload];

    await processor(supabase, items);

    await supabase
      .from("ingest_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("id", eventId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("ingest_events")
      .update({
        status: "failed",
        error: message,
        processed_at: new Date().toISOString(),
      })
      .eq("id", eventId);
  }
}

export async function processUnprocessedEvents(): Promise<ProcessResult> {
  const supabase = createServiceClient();

  // Requeue events stuck in 'processing' for > 5 minutes
  await supabase
    .from("ingest_events")
    .update({ status: "received" })
    .eq("status", "processing")
    .lt(
      "updated_at",
      new Date(Date.now() - 5 * 60 * 1000).toISOString()
    );

  // Fetch up to 25 'received' events
  const { data: events, error } = await supabase
    .from("ingest_events")
    .select("id")
    .eq("status", "received")
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) throw new Error(`Failed to fetch events: ${error.message}`);
  if (!events || events.length === 0) {
    return { processed: 0, failed: 0, remaining: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      await processIngestEvent(event.id);
      processed++;
    } catch {
      failed++;
    }
  }

  // Count remaining
  const { count } = await supabase
    .from("ingest_events")
    .select("id", { count: "exact", head: true })
    .eq("status", "received");

  return { processed, failed, remaining: count ?? 0 };
}
