import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export async function logSync(
  source: string,
  status: "success" | "error" | "partial" | "running",
  recordCount: number,
  error?: string
): Promise<string | null> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const row: Record<string, unknown> = {
    source,
    status,
    record_count: recordCount,
    records_synced: recordCount,
    started_at: now,
    ...(status !== "running" ? { completed_at: now } : {}),
    ...(error ? { error_message: error, message: error } : {}),
  };

  const { data, error: insertError } = await supabase
    .from("sync_log")
    .insert(row)
    .select("id")
    .single();

  if (insertError) {
    return null;
  }

  return data?.id ?? null;
}
