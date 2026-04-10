import { NextRequest, NextResponse } from "next/server";
import { processMemoryIntakeQueue } from "@/lib/memory-intake/processor";
import { withErrorHandler } from "@/lib/api-error-handler";
import { verifyCronAuth } from "@/lib/cron-auth";

async function handleProcessIntake(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const result = await processMemoryIntakeQueue();

  return NextResponse.json(
    {
      success: result.failed === 0,
      processed: result.processed,
      skipped: result.skipped,
      failed: result.failed,
      errors: result.errors,
    },
    { status: result.failed === 0 ? 200 : 207 }
  );
}

export const POST = withErrorHandler(handleProcessIntake);
