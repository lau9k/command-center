import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import client from "@/lib/personize/client";

interface QueueEntry {
  id: string;
  target_email: string | null;
  content: string;
  source_ref: string;
  content_hash: string;
}

interface ProcessResult {
  processed: number;
  skipped: number;
  failed: number;
  errors: string[];
}

const BATCH_LIMIT = 50;

/**
 * Process all pending entries in memory_intake_queue:
 * 1. Fetch pending entries
 * 2. Dedup against memory_ingestion_log
 * 3. Call Personize memorize for each new entry
 * 4. Log results to memory_ingestion_log
 * 5. Update queue entry status
 */
export async function processMemoryIntakeQueue(): Promise<ProcessResult> {
  const supabase = createServiceClient();
  const result: ProcessResult = { processed: 0, skipped: 0, failed: 0, errors: [] };

  // 1. Fetch pending entries and atomically mark them as processing
  const { data: pending, error: fetchError } = await supabase
    .from("memory_intake_queue")
    .select("id, target_email, content, source_ref, content_hash")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (fetchError) {
    throw new Error(`Failed to fetch pending queue entries: ${fetchError.message}`);
  }

  if (!pending || pending.length === 0) {
    return result;
  }

  const entries = pending as QueueEntry[];

  // Mark all fetched entries as processing
  const entryIds = entries.map((e) => e.id);
  await supabase
    .from("memory_intake_queue")
    .update({ status: "processing" })
    .in("id", entryIds);

  // 2. Batch dedup check — fetch existing hashes from ingestion log
  const hashes = entries.map((e) => e.content_hash);
  const { data: existingLogs } = await supabase
    .from("memory_ingestion_log")
    .select("content_hash")
    .in("content_hash", hashes)
    .eq("status", "success");

  const existingHashes = new Set((existingLogs ?? []).map((l) => l.content_hash as string));

  // 3. Process each entry
  for (const entry of entries) {
    // Dedup: skip if already memorized
    if (existingHashes.has(entry.content_hash)) {
      await supabase
        .from("memory_intake_queue")
        .update({ status: "done", processed_at: new Date().toISOString() })
        .eq("id", entry.id);
      result.skipped++;
      continue;
    }

    try {
      // Call Personize memorize
      const response = await client.memory.memorize({
        content: entry.content,
        tags: ["memory-intake", entry.source_ref],
        enhanced: true,
        ...(entry.target_email ? { email: entry.target_email } : {}),
      });

      const eventId =
        (response as { data?: { eventId?: string } })?.data?.eventId ?? null;

      // Log to ingestion log
      await supabase.from("memory_ingestion_log").insert({
        content_hash: entry.content_hash,
        source_ref: entry.source_ref,
        personize_event_id: eventId,
        status: "success",
      });

      // Mark queue entry as done
      await supabase
        .from("memory_intake_queue")
        .update({
          status: "done",
          personize_event_id: eventId,
          processed_at: new Date().toISOString(),
        })
        .eq("id", entry.id);

      result.processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";

      // Log failure to ingestion log
      await supabase.from("memory_ingestion_log").upsert(
        {
          content_hash: entry.content_hash,
          source_ref: entry.source_ref,
          status: "failed",
        },
        { onConflict: "content_hash" }
      );

      // Mark queue entry as failed
      await supabase
        .from("memory_intake_queue")
        .update({
          status: "failed",
          error_message: message,
          processed_at: new Date().toISOString(),
        })
        .eq("id", entry.id);

      result.failed++;
      result.errors.push(`${entry.source_ref}: ${message}`);
    }
  }

  return result;
}
