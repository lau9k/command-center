import { createServiceClient } from "@/lib/supabase/service";
import client from "./client";
import { memorize } from "./actions";
import type { PersonizeSyncStatus } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const SYNCABLE_TABLES = [
  "contacts",
  "tasks",
  "pipeline_items",
  "content_posts",
  "meetings",
] as const;

export type SyncableTable = (typeof SYNCABLE_TABLES)[number];

export function isSyncableTable(value: string): value is SyncableTable {
  return (SYNCABLE_TABLES as readonly string[]).includes(value);
}

export { SYNCABLE_TABLES };

export interface SyncRecord {
  table: SyncableTable;
  id: string;
}

export interface BulkSyncResult {
  retried: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RATE_LIMIT_MS = 400;

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

// ---------------------------------------------------------------------------
// Single-record sync
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Record content builder
// ---------------------------------------------------------------------------

/** Build a text summary of a record suitable for Personize memorization. */
function recordToContent(table: SyncableTable, record: Record<string, unknown>): string {
  const id = String(record.id ?? "unknown");

  switch (table) {
    case "contacts": {
      const parts = [`Contact: ${record.name ?? "Unknown"}`];
      if (record.email) parts.push(`Email: ${String(record.email)}`);
      if (record.company) parts.push(`Company: ${String(record.company)}`);
      if (record.role) parts.push(`Role: ${String(record.role)}`);
      if (record.phone) parts.push(`Phone: ${String(record.phone)}`);
      if (record.notes) parts.push(`Notes: ${String(record.notes)}`);
      return parts.join("\n");
    }
    case "tasks": {
      const parts = [`Task: ${record.title ?? "Untitled"}`];
      if (record.description) parts.push(`Description: ${String(record.description)}`);
      if (record.status) parts.push(`Status: ${String(record.status)}`);
      if (record.priority) parts.push(`Priority: ${String(record.priority)}`);
      if (record.assignee) parts.push(`Assignee: ${String(record.assignee)}`);
      return parts.join("\n");
    }
    case "pipeline_items": {
      const parts = [`Pipeline Item: ${record.title ?? "Untitled"}`];
      if (record.entity_type) parts.push(`Type: ${String(record.entity_type)}`);
      return parts.join("\n");
    }
    case "content_posts": {
      const parts = [`Content Post: ${record.title ?? "Untitled"}`];
      if (record.platform) parts.push(`Platform: ${String(record.platform)}`);
      if (record.status) parts.push(`Status: ${String(record.status)}`);
      if (record.body) parts.push(`Body: ${String(record.body).slice(0, 500)}`);
      return parts.join("\n");
    }
    case "meetings": {
      const parts = [`Meeting: ${record.title ?? "Untitled"}`];
      if (record.meeting_date) parts.push(`Date: ${String(record.meeting_date)}`);
      if (record.status) parts.push(`Status: ${String(record.status)}`);
      if (record.summary) parts.push(`Summary: ${String(record.summary).slice(0, 500)}`);
      return parts.join("\n");
    }
    default: {
      return `Record ${id} from ${table}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Bulk sync
// ---------------------------------------------------------------------------

/**
 * Sync a batch of records to Personize with 400ms rate limiting between calls.
 * For each record: fetch from Supabase, memorize to Personize, update sync status.
 */
export async function bulkSyncToPersonize(
  records: SyncRecord[]
): Promise<BulkSyncResult> {
  const supabase = createServiceClient();
  let retried = 0;
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const { table, id } = records[i];

    try {
      // Fetch full record
      const { data: row, error: fetchError } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError || !row) {
        errors.push(`${table}/${id}: ${fetchError?.message ?? "not found"}`);
        continue;
      }

      const record = row as Record<string, unknown>;
      const content = recordToContent(table, record);

      // Sync to Personize via memorize
      const success = await memorize(content, [table, "sync-retry"]);

      if (success) {
        // Mark as synced
        await supabase
          .from(table)
          .update({
            personize_sync_status: "synced",
            personize_synced_at: new Date().toISOString(),
          })
          .eq("id", id);
        retried++;
      } else {
        // Mark as failed
        await supabase
          .from(table)
          .update({ personize_sync_status: "failed" })
          .eq("id", id);
        errors.push(`${table}/${id}: Personize memorize failed`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${table}/${id}: ${message}`);
    }

    // Rate limit between calls (skip after last)
    if (i < records.length - 1) {
      await delay(RATE_LIMIT_MS);
    }
  }

  return { retried, errors };
}
