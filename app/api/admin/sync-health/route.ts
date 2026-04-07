import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SyncSource {
  id: string;
  source: string;
  display_name: string;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  error_count_24h: number;
  backoff_until: string | null;
  status: "healthy" | "degraded" | "failing" | "unknown";
  sync_frequency_minutes: number | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeStatus(
  lastSuccessAt: string | null,
  syncFrequencyMinutes: number | null,
  errorCount24h: number,
): "healthy" | "degraded" | "failing" | "unknown" {
  if (!lastSuccessAt) return "unknown";

  const now = Date.now();
  const lastSuccess = new Date(lastSuccessAt).getTime();
  const freq = syncFrequencyMinutes ?? 60; // default 60 min
  const ageMs = now - lastSuccess;
  const freqMs = freq * 60 * 1000;

  const isStale = ageMs > 2 * freqMs;
  const isWithinFrequency = ageMs <= freqMs;

  // failing: stale AND high error count
  if (isStale && errorCount24h > 10) return "failing";

  // degraded: either moderately stale or moderate errors
  if (!isWithinFrequency || (errorCount24h >= 3 && errorCount24h <= 10))
    return "degraded";

  // healthy: within frequency and low error count
  if (isWithinFrequency && errorCount24h < 3) return "healthy";

  return "unknown";
}

function isStale(
  lastSuccessAt: string | null,
  syncFrequencyMinutes: number | null,
): boolean {
  if (!lastSuccessAt) return false;
  const freq = syncFrequencyMinutes ?? 60;
  const ageMs = Date.now() - new Date(lastSuccessAt).getTime();
  return ageMs > 2 * freq * 60 * 1000;
}

// ---------------------------------------------------------------------------
// GET /api/admin/sync-health
// ---------------------------------------------------------------------------

export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("sync_sources")
    .select("*")
    .order("display_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sources = (data as SyncSource[]).map((s) => ({
    ...s,
    is_stale: isStale(s.last_success_at, s.sync_frequency_minutes),
  }));

  return NextResponse.json({ data: sources });
}));

// ---------------------------------------------------------------------------
// PATCH /api/admin/sync-health
// ---------------------------------------------------------------------------

export const PATCH = withErrorHandler(withAuth(async function PATCH(
  request,
  _user,
) {
  const body = await request.json();
  const { source, success, error: errorMessage } = body as {
    source: string;
    success: boolean;
    error?: string;
  };

  if (!source || typeof success !== "boolean") {
    return NextResponse.json(
      { error: "Missing required fields: source, success" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Fetch current row
  const { data: existing, error: fetchError } = await supabase
    .from("sync_sources")
    .select("*")
    .eq("source", source)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: `Source not found: ${source}` },
      { status: 404 },
    );
  }

  const current = existing as SyncSource;

  // Build update
  const updates: Record<string, unknown> = { updated_at: now };

  if (success) {
    updates.last_success_at = now;
    // Reset error count on success
    updates.error_count_24h = Math.max(0, current.error_count_24h - 1);
  } else {
    updates.last_error_at = now;
    updates.last_error_message = errorMessage ?? null;
    updates.error_count_24h = current.error_count_24h + 1;
  }

  // Compute new status
  const newErrorCount = (updates.error_count_24h ?? current.error_count_24h) as number;
  const newLastSuccess = (updates.last_success_at ?? current.last_success_at) as string | null;
  updates.status = computeStatus(
    newLastSuccess,
    current.sync_frequency_minutes,
    newErrorCount,
  );

  const { data: updated, error: updateError } = await supabase
    .from("sync_sources")
    .update(updates)
    .eq("source", source)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}));
