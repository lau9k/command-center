import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";
import { logActivity } from "@/lib/activity-logger";
import { logSync } from "@/lib/gmail-sync-log";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { n8nContactPayload } from "@/lib/ingest/n8n-adapters";
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
  const parsed = n8nContactPayload.safeParse(JSON.parse(rawBody));
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
  const eventIds: string[] = [];
  const itemsToProcess: typeof items = [];

  for (const item of items) {
    const key = buildIdempotencyKey("n8n", "contact", item.email);
    const result = await logIngestEvent({
      source: "n8n",
      entityType: "contact",
      idempotencyKey: key,
      payloadHash: pHash,
      n8nExecutionId,
    });

    if (result.duplicate) continue;

    if (result.event) eventIds.push(result.event.id);
    itemsToProcess.push(item);
  }

  // All items were duplicates
  if (itemsToProcess.length === 0) {
    return NextResponse.json(
      { success: true, data: [], count: 0, deduplicated: true },
      { status: 200 }
    );
  }

  const supabase = createServiceClient();

  // Upsert by email — update existing contact or insert new one
  const { data, error } = await supabase
    .from("contacts")
    .upsert(itemsToProcess, { onConflict: "email" })
    .select();

  if (error) {
    for (const eventId of eventIds) {
      void markEventFailed(eventId, error.message);
    }
    void logSync("n8n:contacts", "error", 0, error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  for (const eventId of eventIds) {
    void markEventProcessed(eventId);
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

  return NextResponse.json(
    { success: true, data: results, count: results.length },
    { status: 201 }
  );
}), RATE_LIMITS.ingest);
