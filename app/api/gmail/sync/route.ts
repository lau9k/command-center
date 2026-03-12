import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { syncGmail, getLastSyncDate } from "@/lib/gmail-sync";

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  // Verify cron key or API secret for authorization
  const authHeader = request.headers.get("authorization");
  const cronKey = process.env.CRON_KEY;
  const apiSecret = process.env.API_SECRET;

  const token = authHeader?.replace("Bearer ", "");
  if (!token || (token !== cronKey && token !== apiSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await syncGmail();

  return NextResponse.json({
    success: summary.success,
    synced: summary.synced,
    errors: summary.errors,
    results: summary.results,
  });
});

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronKey = process.env.CRON_KEY;
  const apiSecret = process.env.API_SECRET;

  const token = authHeader?.replace("Bearer ", "");
  if (!token || (token !== cronKey && token !== apiSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lastSync = await getLastSyncDate();

  return NextResponse.json({ lastSync });
});
