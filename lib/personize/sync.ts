import { createServiceClient } from "@/lib/supabase/service";
import { memorize } from "./actions";

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

export interface SyncDealContext {
  company_name: string;
  amount: number | null;
  stage_name: string;
  notes: string | null;
  contact_email: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RATE_LIMIT_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
// Single-record sync
// ---------------------------------------------------------------------------

/**
 * Sync a record to Personize and update its sync status in Supabase.
 * Sets status to 'pending' before calling Personize, then updates to 'synced' or 'failed'.
 * Never throws — sync failures are logged but do not propagate.
 */
export async function syncToPersonize({
  table,
  recordId,
  content,
  email,
}: {
  table: SyncableTable;
  recordId: string;
  content: string;
  email?: string;
}): Promise<void> {
  const supabase = createServiceClient();

  try {
    // Set status to pending
    await supabase
      .from(table)
      .update({
        personize_sync_status: "pending",
        personize_synced_at: null,
      })
      .eq("id", recordId);

    // Sync to Personize
    const success = await memorize(content, [table], email);

    // Update status based on result
    await supabase
      .from(table)
      .update({
        personize_sync_status: success ? "synced" : "failed",
        personize_synced_at: success ? new Date().toISOString() : null,
      })
      .eq("id", recordId);
  } catch (error) {
    console.error(`[Personize] syncToPersonize failed for ${table}/${recordId}:`, error);

    // Best-effort status update on failure
    try {
      await supabase
        .from(table)
        .update({
          personize_sync_status: "failed",
          personize_synced_at: null,
        })
        .eq("id", recordId);
    } catch {
      // Ignore — we already logged the primary error
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

// ---------------------------------------------------------------------------
// Pipeline deal sync
// ---------------------------------------------------------------------------

/**
 * Sync a pipeline deal's context to Personize via the memorize helper.
 * Fire-and-forget — never throws.
 */
export async function syncDealToPersonize(context: SyncDealContext): Promise<boolean> {
  try {
    const content = JSON.stringify(context);
    const tags = ["pipeline", "deal-stage-change", context.stage_name];

    return await memorize(content, tags, context.contact_email ?? undefined);
  } catch (error) {
    console.error("[Personize] syncDealToPersonize failed:", error);
    return false;
  }
}
