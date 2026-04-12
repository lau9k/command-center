import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { reconcileOrphanPosts } from "@/lib/lateso-sync";
import { withErrorHandler } from "@/lib/api-error-handler";

// ---------------------------------------------------------------------------
// Auth helper (same pattern as sync-reconcile)
// ---------------------------------------------------------------------------

function authorize(req: NextRequest): NextResponse | null {
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SEED_SECRET env var is not configured" },
      { status: 500 }
    );
  }

  const provided =
    req.headers.get("x-seed-secret") ??
    req.nextUrl.searchParams.get("secret");

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

// ---------------------------------------------------------------------------
// GET /api/admin/reconcile-orphan-posts — list orphans (dry-run)
// ---------------------------------------------------------------------------

export const GET = withErrorHandler(async function GET(req: NextRequest) {
  const authError = authorize(req);
  if (authError) return authError;

  const supabase = createServiceClient();

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: orphans, error } = await supabase
    .from("content_posts")
    .select("id, title, status, late_post_id, scheduled_for, updated_at")
    .eq("status", "scheduled")
    .is("late_post_id", null)
    .lt("updated_at", oneHourAgo);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: orphans?.length ?? 0, orphans });
});

// ---------------------------------------------------------------------------
// POST /api/admin/reconcile-orphan-posts — reconcile orphans
// ---------------------------------------------------------------------------

export const POST = withErrorHandler(async function POST(req: NextRequest) {
  const authError = authorize(req);
  if (authError) return authError;

  const result = await reconcileOrphanPosts();

  return NextResponse.json(
    {
      success: result.errors === 0,
      requeued: result.requeued,
      failed: result.failed,
      errors: result.errors,
    },
    { status: result.errors === 0 ? 200 : 207 }
  );
});
