import { createServiceClient } from "@/lib/supabase/service";
import client from "./client";
import type { PersonizeSyncStatus } from "@/lib/types/database";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Update a record's personize_sync_status and personize_synced_at in Supabase.
 */
async function updateSyncStatus(
  table: string,
  recordId: string,
  status: PersonizeSyncStatus,
  syncedAt?: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from(table)
    .update({
      personize_sync_status: status,
      ...(syncedAt ? { personize_synced_at: syncedAt } : {}),
    })
    .eq("id", recordId);

  if (error) {
    console.error("[Personize] Failed to update sync status", {
      table,
      recordId,
      status,
      error: error.message,
    });
  }
}

/**
 * Sync a single record to Personize and update its status in Supabase.
 *
 * Expects the record's `personize_sync_status` to already be 'pending' (set by the caller).
 * On success → 'synced' with timestamp. On failure → 'failed'.
 * Never throws — errors are logged with full context.
 */
export async function syncToPersonize(
  table: string,
  recordId: string,
  content: string,
  email: string
): Promise<void> {
  try {
    await client.memory.memorize({
      content,
      email,
      enhanced: true,
    });

    await updateSyncStatus(table, recordId, "synced", new Date().toISOString());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Personize] Sync failed", { table, recordId, email, error: message });
    await updateSyncStatus(table, recordId, "failed");
  }
}

/**
 * Sync multiple records to Personize with a 400ms delay between calls to avoid rate limiting.
 *
 * Best-effort: processes all items even if some fail. Never throws.
 */
export async function bulkSyncToPersonize(
  items: Array<{ table: string; recordId: string; content: string; email: string }>
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await syncToPersonize(item.table, item.recordId, item.content, item.email);

    // 400ms delay between calls (skip after last)
    if (i < items.length - 1) {
      await delay(400);
    }
  }
}
