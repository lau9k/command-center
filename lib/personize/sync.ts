import { createServiceClient } from "@/lib/supabase/service";
import { memorize } from "./actions";

type SyncTable = "contacts" | "tasks" | "pipeline_items" | "content_posts" | "meetings";

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
  table: SyncTable;
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
