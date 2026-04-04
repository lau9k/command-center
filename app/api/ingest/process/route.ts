import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { createServiceClient } from "@/lib/supabase/service";
import { processUnprocessedEvents } from "@/lib/ingest/processor";

/**
 * Verify the caller is authorized via:
 * - Bearer API_SECRET (manual trigger / Vercel cron with CRON_SECRET = API_SECRET)
 * - Bearer CRON_SECRET (Vercel cron automatic header)
 * - x-cron-key header (legacy support)
 */
function isAuthorized(request: NextRequest): boolean {
  const apiSecret = process.env.API_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  if (!apiSecret && !cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.replace("Bearer ", "");
  const cronKey = request.headers.get("x-cron-key");

  if (apiSecret && (bearerToken === apiSecret || cronKey === apiSecret)) return true;
  if (cronSecret && bearerToken === cronSecret) return true;
  return false;
}

async function handleProcess(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Reap expired claims before processing
  const supabase = createServiceClient();
  const { data: reaped, error: reapError } = await supabase.rpc("reap_expired_claims");

  if (reapError) {
    if (process.env.NODE_ENV === "development") console.error("[ingest/process] Reaper failed:", reapError.message);
  }

  const result = await processUnprocessedEvents();

  return NextResponse.json({ success: true, ...result }, { status: 200 });
}

// Vercel cron sends GET requests
export const GET = withErrorHandler(handleProcess);
// Manual triggers use POST
export const POST = withErrorHandler(handleProcess);
