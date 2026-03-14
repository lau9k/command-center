import { createServiceClient } from "@/lib/supabase/service";

export interface WebhookEvent {
  id: string;
  source: string;
  endpoint: string;
  method: string;
  status_code: number;
  payload_preview: string | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  event_type: string | null;
  headers: Record<string, string> | null;
  body: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  processed: boolean;
  retry_count: number;
  last_retry_at: string | null;
}

export interface WebhookEventsResult {
  data: WebhookEvent[];
  total: number;
}

export interface WebhookEventsFilters {
  source?: string;
  status?: "success" | "failed" | "pending" | "all";
  eventType?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function getWebhookEvents(
  filters: WebhookEventsFilters
): Promise<WebhookEventsResult> {
  const supabase = createServiceClient();
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  let query = supabase
    .from("webhook_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.source) {
    query = query.eq("source", filters.source);
  }

  if (filters.eventType) {
    query = query.eq("event_type", filters.eventType);
  }

  if (filters.status === "success") {
    query = query.gte("status_code", 200).lt("status_code", 300);
  } else if (filters.status === "failed") {
    query = query.or("status_code.lt.200,status_code.gte.300");
  } else if (filters.status === "pending") {
    query = query.eq("processed", false);
  }

  if (filters.from) {
    query = query.gte("created_at", filters.from);
  }
  if (filters.to) {
    query = query.lte("created_at", filters.to);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return { data: (data as WebhookEvent[]) ?? [], total: count ?? 0 };
}

export async function getWebhookEventById(
  id: string
): Promise<WebhookEvent | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("webhook_events")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  return data as WebhookEvent;
}

export async function retryWebhookEvent(id: string): Promise<WebhookEvent> {
  const event = await getWebhookEventById(id);
  if (!event) {
    throw new Error("Webhook event not found");
  }

  const supabase = createServiceClient();
  const startTime = Date.now();

  let statusCode: number;
  let responseBody: Record<string, unknown> | null = null;
  let errorMessage: string | null = null;

  try {
    const fetchHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (event.headers) {
      const safeHeaders = { ...event.headers };
      delete safeHeaders["host"];
      delete safeHeaders["content-length"];
      Object.assign(fetchHeaders, safeHeaders);
    }

    const res = await fetch(event.endpoint, {
      method: event.method,
      headers: fetchHeaders,
      body: event.body ? JSON.stringify(event.body) : undefined,
    });

    statusCode = res.status;

    try {
      responseBody = (await res.json()) as Record<string, unknown>;
    } catch {
      responseBody = { text: await res.clone().text().catch(() => "") };
    }
  } catch (err) {
    statusCode = 0;
    errorMessage =
      err instanceof Error ? err.message : "Unknown error during retry";
  }

  const durationMs = Date.now() - startTime;

  const { data: updated, error: updateError } = await supabase
    .from("webhook_events")
    .update({
      status_code: statusCode,
      duration_ms: durationMs,
      error_message: errorMessage,
      response: responseBody,
      retry_count: (event.retry_count ?? 0) + 1,
      last_retry_at: new Date().toISOString(),
      processed: statusCode >= 200 && statusCode < 300,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return updated as WebhookEvent;
}

export function formatWebhookStatus(
  statusCode: number,
  processed: boolean
): "success" | "failed" | "pending" {
  if (statusCode >= 200 && statusCode < 300) return "success";
  if (!processed && statusCode === 0) return "pending";
  return "failed";
}
