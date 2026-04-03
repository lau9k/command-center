import "server-only";
import { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import type { IngestEvent, IngestEventStatus } from "@/lib/types/database";

/**
 * Derives a deterministic idempotency key from the source, entity type, and
 * a per-entity identifier (external_id for most entities, email for contacts).
 */
export function buildIdempotencyKey(
  source: string,
  entityType: string,
  entityId: string
): string {
  return `${source}:${entityType}:${entityId}`;
}

/**
 * SHA-256 hash of the raw JSON payload for integrity verification.
 */
export function hashPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

interface LogIngestEventParams {
  source: string;
  entityType: string;
  idempotencyKey: string;
  payloadHash: string;
  n8nExecutionId?: string | null;
}

/**
 * Logs an ingest event to the ledger BEFORE processing begins.
 * Returns the event record on success, or null if the idempotency key
 * already exists (duplicate delivery).
 *
 * Never throws — callers should check for null to detect duplicates.
 */
export async function logIngestEvent(
  params: LogIngestEventParams
): Promise<IngestEvent | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("ingest_events")
    .insert({
      source: params.source,
      entity_type: params.entityType,
      idempotency_key: params.idempotencyKey,
      payload_hash: params.payloadHash,
      n8n_execution_id: params.n8nExecutionId ?? null,
      status: "received" as IngestEventStatus,
    })
    .select()
    .single();

  if (error) {
    // Unique constraint violation → duplicate delivery
    if (error.code === "23505") return null;
    // Unexpected error — log but don't throw to avoid breaking the ingest flow
    console.error("[event-logger] Failed to log ingest event:", error.message);
    return null;
  }

  return data as IngestEvent;
}

/**
 * Marks an ingest event as successfully processed.
 */
export async function markEventProcessed(eventId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("ingest_events")
    .update({
      status: "processed" as IngestEventStatus,
      processed_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    console.error("[event-logger] Failed to mark event processed:", error.message);
  }
}

/**
 * Marks an ingest event as failed, recording the error message and
 * incrementing the attempt counter.
 */
export async function markEventFailed(
  eventId: string,
  errorMessage: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.rpc("increment_ingest_attempt", {
    p_event_id: eventId,
    p_error: errorMessage,
  });

  // Fallback to a plain update if the RPC doesn't exist yet
  if (error) {
    const { error: updateError } = await supabase
      .from("ingest_events")
      .update({
        status: "failed" as IngestEventStatus,
        last_error: errorMessage,
        attempt_count: 1,
      })
      .eq("id", eventId);

    if (updateError) {
      console.error("[event-logger] Failed to mark event failed:", updateError.message);
    }
  }
}
