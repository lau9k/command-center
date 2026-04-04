import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/ingest/replay
 *
 * Replays dead-lettered (or retryable) ingest events by calling
 * server-side RPCs that fully reset queue metadata.
 *
 * Body:
 *   - event_id?: string   — replay a single event
 *   - source?: string     — filter bulk replay by source
 *   - entity_type?: string — filter bulk replay by entity type
 *   - limit?: number      — max events to replay (default 50)
 *   - reason?: string     — audit trail
 */
export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.API_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    event_id?: string;
    source?: string;
    entity_type?: string;
    limit?: number;
    reason?: string;
  };

  const supabase = createServiceClient();

  // ── Single event replay ──────────────────────────────────
  if (body.event_id) {
    const { data, error } = await supabase.rpc("replay_ingest_event", {
      p_event_id: body.event_id,
      p_replayed_by: "api",
      p_reason: body.reason ?? "manual replay",
    });

    if (error) {
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { success: false, error: "not_found" },
          { status: 404 }
        );
      }
      if (error.message.includes("expected dead_letter or retryable")) {
        return NextResponse.json(
          { success: false, error: "invalid_state", message: error.message },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: "replay_failed", message: error.message },
        { status: 500 }
      );
    }

    const result = Array.isArray(data) ? data[0] : data;
    return NextResponse.json(
      { success: true, status: "replayed", result },
      { status: 200 }
    );
  }

  // ── Bulk dead-letter replay ──────────────────────────────
  const { data, error } = await supabase.rpc("replay_dead_letter_ingest_events", {
    p_limit: body.limit ?? 50,
    p_source: body.source ?? null,
    p_entity_type: body.entity_type ?? null,
    p_replayed_by: "api",
    p_reason: body.reason ?? "bulk replay",
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: "replay_failed", message: error.message },
      { status: 500 }
    );
  }

  const results = Array.isArray(data) ? data : [];
  return NextResponse.json(
    { success: true, replayed: results.length, results },
    { status: 200 }
  );
});
