import { createServiceClient } from "@/lib/supabase/service";

export interface ActivityLogEntry {
  action: "created" | "updated" | "deleted" | "ingested" | "synced";
  entity_type:
    | "contact"
    | "task"
    | "conversation"
    | "sponsor"
    | "transaction"
    | "content_post"
    | "event";
  entity_id?: string;
  entity_name?: string;
  source?: "manual" | "webhook" | "n8n" | "granola" | "plaid" | "personize";
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget activity logger.
 * Inserts a row into the activity_log table. Never throws — logs errors
 * to console so ingestion endpoints are not blocked by logging failures.
 */
export async function logActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("activity_log").insert({
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      entity_name: entry.entity_name ?? null,
      source: entry.source ?? "manual",
      metadata: entry.metadata ?? {},
    });

    if (error) {
      console.error("[activity-logger] Failed to log activity:", error.message);
    }
  } catch (err) {
    console.error(
      "[activity-logger] Unexpected error:",
      err instanceof Error ? err.message : err
    );
  }
}
