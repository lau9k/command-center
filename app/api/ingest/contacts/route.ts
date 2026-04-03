import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { n8nContactPayload } from "@/lib/ingest/n8n-adapters";
import {
  logIngestEvent,
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

  for (const item of items) {
    const key = buildIdempotencyKey("n8n", "contact", item.email);
    const result = await logIngestEvent({
      source: "n8n",
      entityType: "contact",
      idempotencyKey: key,
      payloadHash: pHash,
      payload: item,
      n8nExecutionId,
    });

    if (result.duplicate) continue;
    if (result.event) eventIds.push(result.event.id);
  }

  if (eventIds.length === 0) {
    return NextResponse.json(
      { success: true, event_ids: [], count: 0, deduplicated: true },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { success: true, event_ids: eventIds, count: eventIds.length },
    { status: 202 }
  );
}), RATE_LIMITS.ingest);
