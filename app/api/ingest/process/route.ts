import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { createServiceClient } from "@/lib/supabase/service";
import { processUnprocessedEvents } from "@/lib/ingest/processor";

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.API_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Reap expired claims before processing
  const supabase = createServiceClient();
  const { data: reaped, error: reapError } = await supabase.rpc("reap_expired_claims");

  if (reapError) {
    console.error("[ingest/process] Reaper failed:", reapError.message);
  } else {
    const reapCount = typeof reaped === "number" ? reaped : 0;
    if (reapCount > 0) {
      console.log(`[ingest/process] Reaped ${reapCount} expired claims`);
    }
  }

  const result = await processUnprocessedEvents();

  return NextResponse.json({ success: true, ...result }, { status: 200 });
});
