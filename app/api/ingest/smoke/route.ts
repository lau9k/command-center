import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { createServiceClient } from "@/lib/supabase/service";
import {
  logIngestEvent,
  buildIdempotencyKey,
  hashPayload,
} from "@/lib/ingest/event-logger";
import { processUnprocessedEvents } from "@/lib/ingest/processor";

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 60_000;

interface SmokeResult {
  passed: boolean;
  smoke_key: string;
  event_id: string | null;
  ingest_ack_ms: number | null;
  queue_to_claim_ms: number | null;
  claim_to_processed_ms: number | null;
  total_e2e_ms: number | null;
  dedup_ok: boolean | null;
  error_message: string | null;
}

function elapsed(start: number): number {
  return Math.round(performance.now() - start);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  // ── Auth (same pattern as process/route.ts) ─────────────
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.API_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = createServiceClient();
  const e2eStart = performance.now();
  const smokeKey = `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const smokeEmail = `smoke-${smokeKey}@test.internal`;

  const result: SmokeResult = {
    passed: false,
    smoke_key: smokeKey,
    event_id: null,
    ingest_ack_ms: null,
    queue_to_claim_ms: null,
    claim_to_processed_ms: null,
    total_e2e_ms: null,
    dedup_ok: null,
    error_message: null,
  };

  try {
    // ── Phase 1: Ingest ───────────────────────────────────
    const ingestStart = performance.now();
    const idempotencyKey = buildIdempotencyKey("synthetic_smoke", "contact", smokeEmail);
    const payload = {
      name: `Smoke Test ${smokeKey}`,
      email: smokeEmail,
      source: "synthetic_smoke",
      notes: `Automated smoke test run ${smokeKey}`,
    };
    const rawPayload = JSON.stringify(payload);

    const logResult = await logIngestEvent({
      source: "synthetic_smoke",
      entityType: "contact",
      idempotencyKey,
      payloadHash: hashPayload(rawPayload),
      payload,
    });

    result.ingest_ack_ms = elapsed(ingestStart);

    if (logResult.duplicate) {
      result.error_message = "Smoke event was a duplicate — smoke_key collision";
      return fail(supabase, result, e2eStart);
    }
    if (!logResult.event) {
      result.error_message = "logIngestEvent returned no event and no duplicate";
      return fail(supabase, result, e2eStart);
    }

    result.event_id = logResult.event.id;

    // ── Phase 2: Process and poll ─────────────────────────
    // Trigger processing directly instead of waiting for cron
    await processUnprocessedEvents();

    const pollStart = performance.now();
    let claimedAt: number | null = null;
    let processedAt: number | null = null;
    const pollDeadline = Date.now() + POLL_TIMEOUT_MS;

    while (Date.now() < pollDeadline) {
      const { data: event } = await supabase
        .from("ingest_events")
        .select("status, claimed_at, processed_at")
        .eq("id", result.event_id)
        .single();

      if (!event) {
        result.error_message = "Ingest event disappeared during polling";
        return fail(supabase, result, e2eStart);
      }

      if (event.status === "processing" && !claimedAt) {
        claimedAt = performance.now();
        result.queue_to_claim_ms = elapsed(pollStart);
      }

      if (event.status === "processed") {
        processedAt = performance.now();
        result.claim_to_processed_ms = claimedAt
          ? Math.round(processedAt - claimedAt)
          : elapsed(pollStart);
        if (!result.queue_to_claim_ms) {
          result.queue_to_claim_ms = 0; // claimed and processed between polls
        }
        break;
      }

      if (event.status === "failed" || event.status === "dead_letter") {
        result.error_message = `Event reached terminal status: ${event.status}`;
        return fail(supabase, result, e2eStart);
      }

      await sleep(POLL_INTERVAL_MS);

      // Trigger processing again in case first call didn't pick it up
      if (event.status === "received" || event.status === "retryable") {
        await processUnprocessedEvents();
      }
    }

    if (processedAt === null) {
      result.error_message = `Event did not reach 'processed' within ${POLL_TIMEOUT_MS / 1000}s`;
      return fail(supabase, result, e2eStart);
    }

    // ── Phase 3: Verify domain write ──────────────────────
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, email")
      .eq("email", smokeEmail)
      .maybeSingle();

    if (!contact) {
      result.error_message = "Contact not found in contacts table after processing";
      return fail(supabase, result, e2eStart);
    }

    // ── Phase 4: Dedup test ───────────────────────────────
    const dedupResult = await logIngestEvent({
      source: "synthetic_smoke",
      entityType: "contact",
      idempotencyKey,
      payloadHash: hashPayload(rawPayload),
      payload,
    });

    result.dedup_ok = dedupResult.duplicate === true;
    if (!result.dedup_ok) {
      result.error_message = "Dedup check failed — second insert was not detected as duplicate";
      return fail(supabase, result, e2eStart);
    }

    // ── Phase 5: Cleanup ──────────────────────────────────
    await supabase.from("contacts").delete().eq("email", smokeEmail);
    await supabase.from("ingest_events").delete().eq("id", result.event_id);

    // ── Success ───────────────────────────────────────────
    result.passed = true;
    result.total_e2e_ms = elapsed(e2eStart);

    await persistResult(supabase, result);

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (err) {
    result.error_message = err instanceof Error ? err.message : String(err);
    return fail(supabase, result, e2eStart);
  }
});

async function fail(
  supabase: ReturnType<typeof createServiceClient>,
  result: SmokeResult,
  e2eStart: number
): Promise<NextResponse> {
  result.total_e2e_ms = elapsed(e2eStart);
  await persistResult(supabase, result);

  // Best-effort cleanup even on failure
  const smokeEmail = `smoke-${result.smoke_key}@test.internal`;
  await supabase.from("contacts").delete().eq("email", smokeEmail);
  if (result.event_id) {
    await supabase.from("ingest_events").delete().eq("id", result.event_id);
  }

  return NextResponse.json({ success: false, ...result }, { status: 200 });
}

async function persistResult(
  supabase: ReturnType<typeof createServiceClient>,
  result: SmokeResult
): Promise<void> {
  const { error } = await supabase.from("ingest_smoke_results").insert({
    smoke_key: result.smoke_key,
    event_id: result.event_id,
    source: "synthetic_smoke",
    passed: result.passed,
    ingest_ack_ms: result.ingest_ack_ms,
    queue_to_claim_ms: result.queue_to_claim_ms,
    claim_to_processed_ms: result.claim_to_processed_ms,
    total_e2e_ms: result.total_e2e_ms,
    dedup_ok: result.dedup_ok,
    error_message: result.error_message,
    verified_at: result.passed ? new Date().toISOString() : null,
  });

  if (error) {
    console.error("[smoke] Failed to persist smoke result:", error.message);
  }
}
