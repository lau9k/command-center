import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { syncGmail, getLastSyncDate } from "@/lib/gmail-sync";
import { verifyCronAuth } from "@/lib/cron-auth";

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const summary = await syncGmail();

  return NextResponse.json({
    success: summary.success,
    synced: summary.synced,
    errors: summary.errors,
    results: summary.results,
  });
});

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const lastSync = await getLastSyncDate();

  return NextResponse.json({ lastSync });
});
