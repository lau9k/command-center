import { NextRequest, NextResponse } from "next/server";
import { syncGranola } from "@/lib/granola-sync";
import { withErrorHandler } from "@/lib/api-error-handler";
import { verifyCronAuth } from "@/lib/cron-auth";

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const result = await syncGranola();

  return NextResponse.json(
    {
      success: result.success,
      synced: result.synced,
      skipped: result.skipped,
      errors: result.errors,
    },
    { status: result.success ? 200 : 207 }
  );
});
