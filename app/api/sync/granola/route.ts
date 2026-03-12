import { NextResponse } from "next/server";
import { syncGranola } from "@/lib/granola-sync";
import { withErrorHandler } from "@/lib/api-error-handler";

export const POST = withErrorHandler(async function POST() {
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
