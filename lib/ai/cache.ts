import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { createHash } from "crypto";

export const TTL_DEFAULTS: Record<string, number> = {
  daily_brief: 180,
  contact_summary: 1440,
  task_priorities: 30,
  pipeline_summary: 60,
};

export interface CacheResult {
  id: string;
  user_id: string;
  view_type: string;
  scope_id: string | null;
  model_mode: string;
  input_hash: string;
  content: Record<string, unknown>;
  token_cost: number;
  created_at: string;
  last_accessed_at: string | null;
  expires_at: string | null;
}

export function computeInputHash(context: string, promptVersion: string): string {
  return createHash("sha256")
    .update(`${context}::${promptVersion}`)
    .digest("hex");
}

export function isCacheFresh(row: CacheResult): boolean {
  if (!row.expires_at) return false;
  return new Date(row.expires_at) > new Date();
}

export async function getCachedContext(
  userId: string,
  viewType: string,
  scopeId: string | null,
  modelMode: string
): Promise<CacheResult | null> {
  const supabase = createServiceClient();

  let query = supabase
    .from("ai_context_cache")
    .select("*")
    .eq("user_id", userId)
    .eq("view_type", viewType)
    .eq("model_mode", modelMode);

  if (scopeId) {
    query = query.eq("scope_id", scopeId);
  } else {
    query = query.is("scope_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) return null;

  // Update last_accessed_at
  await supabase
    .from("ai_context_cache")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", data.id);

  return data as CacheResult;
}

export async function setCachedContext(
  userId: string,
  viewType: string,
  scopeId: string | null,
  modelMode: string,
  inputHash: string,
  content: Record<string, unknown>,
  tokenCost: number,
  ttlMinutes?: number
): Promise<void> {
  const supabase = createServiceClient();
  const ttl = ttlMinutes ?? TTL_DEFAULTS[viewType] ?? 60;
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000).toISOString();

  await supabase.from("ai_context_cache").upsert(
    {
      user_id: userId,
      view_type: viewType,
      scope_id: scopeId,
      model_mode: modelMode,
      input_hash: inputHash,
      content,
      token_cost: tokenCost,
      last_accessed_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: "user_id,view_type,scope_id,model_mode" }
  );
}
