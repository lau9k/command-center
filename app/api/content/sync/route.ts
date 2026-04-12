import { NextRequest, NextResponse } from "next/server";
import { syncLateso } from "@/lib/lateso-sync";
import { withErrorHandler } from "@/lib/api-error-handler";
import { verifyCronAuth } from "@/lib/cron-auth";

async function handleSync(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const result = await syncLateso();

  return NextResponse.json(
    {
      success: result.success,
      pushed: result.pushed,
      pulled: result.pulled,
      skipped: result.skipped,
      errors: result.errors,
      orphansRequeued: result.orphansRequeued,
      orphansFailed: result.orphansFailed,
    },
    { status: result.success ? 200 : 207 }
  );
}

export const GET = withErrorHandler(handleSync);
export const POST = withErrorHandler(handleSync);
