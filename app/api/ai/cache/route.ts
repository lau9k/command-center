import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { aiCacheGetSchema, aiCachePostSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { isCacheFresh, TTL_DEFAULTS } from "@/lib/ai/cache";
import type { CacheResult } from "@/lib/ai/cache";

export const GET = withErrorHandler(withAuth(async function GET(request, _user) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const parsed = aiCacheGetSchema.safeParse({
    user_id: searchParams.get("user_id"),
    view_type: searchParams.get("view_type"),
    scope_id: searchParams.get("scope_id") || null,
    model_mode: searchParams.get("model_mode"),
    input_hash: searchParams.get("input_hash") || null,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { user_id, view_type, scope_id, model_mode, input_hash } = parsed.data;

  let query = supabase
    .from("ai_context_cache")
    .select("*")
    .eq("user_id", user_id)
    .eq("view_type", view_type)
    .eq("model_mode", model_mode);

  if (scope_id) {
    query = query.eq("scope_id", scope_id);
  } else {
    query = query.is("scope_id", null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ data: null });
  }

  const row = data as CacheResult;

  // Update last_accessed_at
  await supabase
    .from("ai_context_cache")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", row.id);

  // Check freshness: expired or input_hash mismatch means stale
  const fresh = isCacheFresh(row) && (!input_hash || row.input_hash === input_hash);

  if (!fresh) {
    return NextResponse.json({ data: { ...row, stale: true } });
  }

  return NextResponse.json({ data: row });
}));

export const POST = withErrorHandler(withAuth(async function POST(request, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = aiCachePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { user_id, view_type, scope_id, model_mode, input_hash, content, token_cost, ttl_minutes } = parsed.data;
  const ttl = ttl_minutes ?? TTL_DEFAULTS[view_type] ?? 60;
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("ai_context_cache")
    .upsert(
      {
        user_id,
        view_type,
        scope_id: scope_id ?? null,
        model_mode,
        input_hash,
        content,
        token_cost,
        last_accessed_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: "user_id,view_type,scope_id,model_mode" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}));
