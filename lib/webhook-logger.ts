import { createServiceClient } from "@/lib/supabase/service";

export interface WebhookEventEntry {
  source: string;
  endpoint: string;
  method?: string;
  status_code: number;
  payload_preview?: string;
  duration_ms?: number;
  error_message?: string;
}

function truncatePayload(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const str = typeof raw === "string" ? raw : JSON.stringify(raw);
  return str.slice(0, 500);
}

/**
 * Fire-and-forget webhook event logger.
 * Inserts a row into the webhook_events table. Never throws — errors are
 * logged to console so webhook handlers are never blocked by logging failures.
 */
export async function logWebhookEvent(entry: WebhookEventEntry): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("webhook_events").insert({
      source: entry.source,
      endpoint: entry.endpoint,
      method: entry.method ?? "POST",
      status_code: entry.status_code,
      payload_preview: truncatePayload(entry.payload_preview),
      duration_ms: entry.duration_ms ?? null,
      error_message: entry.error_message ?? null,
    });

    if (error) {
      console.error("[webhook-logger] Failed to log event:", error.message);
    }
  } catch (err) {
    console.error(
      "[webhook-logger] Unexpected error:",
      err instanceof Error ? err.message : err
    );
  }
}
