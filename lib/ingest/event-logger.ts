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
  payload: Record<string, unknown> | Record<string, unknown>[];
  n8nExecutionId?: string | null;
}

export interface LogIngestEventResult {
  /** Whether this is a duplicate delivery (idempotency key already exists). */
  duplicate: boolean;
  /** The event record, if successfully inserted. Null on duplicate or insert failure. */
  event: IngestEvent | null;
}

/**
 * Logs an ingest event to the ledger BEFORE processing begins.
 * Returns `{ duplicate: true }` when the idempotency key already exists.
 * On any other failure the item should still be processed (graceful degradation).
 *
 * Never throws.
 */
export async function logIngestEvent(
  params: LogIngestEventParams
): Promise<LogIngestEventResult> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("ingest_events")
    .insert({
      source: params.source,
      entity_type: params.entityType,
      idempotency_key: params.idempotencyKey,
      payload_hash: params.payloadHash,
      payload: params.payload,
      n8n_execution_id: params.n8nExecutionId ?? null,
      status: "received" as IngestEventStatus,
    })
    .select()
    .single();

  if (error) {
    // Unique constraint violation → duplicate delivery
    if (error.code === "23505") return { duplicate: true, event: null };
    // Unexpected error — log but allow processing to continue
    console.error("[event-logger] Failed to log ingest event:", error.message);
    return { duplicate: false, event: null };
  }

  return { duplicate: false, event: (data as IngestEvent) ?? null };
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
      claimed_at: null,
      lease_expires_at: null,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    console.error("[event-logger] Failed to mark event processed:", error.message);
  }
}

/**
 * Marks an ingest event as failed, recording the error message.
 */
export async function markEventFailed(
  eventId: string,
  errorMessage: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("ingest_events")
    .update({
      status: "failed" as IngestEventStatus,
      last_error: errorMessage,
      last_error_code: errorMessage.slice(0, 255),
      last_failed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    console.error("[event-logger] Failed to mark event failed:", error.message);
  }
}
