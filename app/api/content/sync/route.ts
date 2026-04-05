import { NextRequest, NextResponse } from "next/server";
import { syncLateso } from "@/lib/lateso-sync";
import { withErrorHandler } from "@/lib/api-error-handler";
import { verifyCronAuth } from "@/lib/cron-auth";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
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
    },
    { status: result.success ? 200 : 207 }
  );
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
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
    },
    { status: result.success ? 200 : 207 }
  );
});
