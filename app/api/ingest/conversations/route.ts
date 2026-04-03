import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";
import { logActivity } from "@/lib/activity-logger";
import { logSync } from "@/lib/gmail-sync-log";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { n8nConversationPayload } from "@/lib/ingest/n8n-adapters";
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
  const parsed = n8nConversationPayload.safeParse(JSON.parse(rawBody));
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
    const key = buildIdempotencyKey("n8n", "conversation", item.external_id);
    const event = await logIngestEvent({
      source: "n8n",
      entityType: "conversation",
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

  // Batch-lookup contacts by email
  const emails = [...new Set(itemsToProcess.map((c) => c.contact_email))];
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, email")
    .in("email", emails);

  const emailToId = new Map<string, string>();
  for (const c of contacts ?? []) {
    if (c.email) emailToId.set(c.email, c.id);
  }

  // Build upsert rows with contact_id resolved
  const rows = itemsToProcess.map(({ contact_email, ...rest }) => ({
    ...rest,
    contact_id: emailToId.get(contact_email) ?? null,
  }));

  // Upsert by external_id — dedup on Gmail thread ID or Slack channel ID
  const { data, error } = await supabase
    .from("conversations")
    .upsert(rows, { onConflict: "external_id" })
    .select();

  if (error) {
    for (const eventId of eventMap.values()) {
      void markEventFailed(eventId, error.message);
    }
    void logSync("n8n:conversations", "error", 0, error.message);
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
      entity_type: "conversation",
      entity_id: row.id,
      entity_name: row.summary,
      source: "n8n",
    });
  }

  void logSync("n8n:conversations", "success", results.length);

  return NextResponse.json(
    { success: true, data: results, count: results.length },
    { status: 201 }
  );
}), RATE_LIMITS.ingest);
