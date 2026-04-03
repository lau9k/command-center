import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";
import { logActivity } from "@/lib/activity-logger";
import { logSync } from "@/lib/gmail-sync-log";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { Task } from "@/lib/types/database";
import { scoreTask } from "@/lib/task-scoring";
import { n8nTaskPayload } from "@/lib/ingest/n8n-adapters";
import {
  logIngestEvent,
  markEventProcessed,
  markEventFailed,
  buildIdempotencyKey,
  hashPayload,
} from "@/lib/ingest/event-logger";

export const POST = withRateLimit(withErrorHandler(async function POST(request: NextRequest) {
  const authError = validateWebhookSecret(request);
  if (authError) return authError;

  const rawBody = await request.text();
  const parsed = n8nTaskPayload.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const items = parsed.data;
  const n8nExecutionId = request.headers.get("x-n8n-execution-id");
  const pHash = hashPayload(rawBody);

  // Log each item to the ingest ledger; skip duplicates
  const eventMap = new Map<number, string>();
  const itemsToProcess: typeof items = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = buildIdempotencyKey("n8n", "task", item.external_id);
    const event = await logIngestEvent({
      source: "n8n",
      entityType: "task",
      idempotencyKey: key,
      payloadHash: pHash,
      n8nExecutionId,
    });

    if (event) {
      eventMap.set(i, event.id);
      itemsToProcess.push(item);
    }
  }

  if (itemsToProcess.length === 0) {
    return NextResponse.json(
      { success: true, data: [], count: 0, deduplicated: true },
      { status: 200 }
    );
  }

  const supabase = createServiceClient();

  // Collect unique project IDs to batch-fetch names
  const projectIds = [...new Set(itemsToProcess.map((t) => t.project_id).filter(Boolean))] as string[];
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
  const rows = itemsToProcess.map((item) => {
    const taskForScoring: Task = {
      id: "",
      external_id: item.external_id,
      title: item.title,
      description: item.description ?? null,
      status: item.status ?? "todo",
      priority: item.priority ?? "medium",
      due_date: item.due_date ?? null,
      assignee: item.assignee ?? null,
      tags: item.tags ?? null,
      project_id: item.project_id ?? null,
      recurrence_rule: null,
      recurrence_parent_id: null,
      is_recurring_template: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const project = item.project_id ? projectMap.get(item.project_id) ?? null : null;
    const { score } = scoreTask(taskForScoring, project);

    return { ...item, priority_score: score };
  });

  // Upsert by external_id for deduplication
  const { data, error } = await supabase
    .from("tasks")
    .upsert(rows, { onConflict: "external_id" })
    .select();

  if (error) {
    for (const eventId of eventMap.values()) {
      void markEventFailed(eventId, error.message);
    }
    void logSync("n8n:tasks", "error", 0, error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  for (const eventId of eventMap.values()) {
    void markEventProcessed(eventId);
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

  return NextResponse.json(
    { success: true, data: results, count: results.length },
    { status: 201 }
  );
}), RATE_LIMITS.ingest);
