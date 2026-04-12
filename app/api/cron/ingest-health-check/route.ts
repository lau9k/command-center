import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { verifyCronAuth } from "@/lib/cron-auth";
import { runHealthCheck, alertOnIssues } from "@/lib/ingest-health-check";

async function handleHealthCheck(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const result = await runHealthCheck();

  // Alert on issues (with 4-hour dedup)
  const alerted = await alertOnIssues(result.issues);

  return NextResponse.json(
    {
      ok: result.ok,
      checked_at: result.checked_at,
      issues_found: result.issues.length,
      notifications_sent: alerted,
      issues: result.issues,
      sources: result.sources,
    },
    { status: result.ok ? 200 : 207 }
  );
}

export const GET = withErrorHandler(handleHealthCheck);
export const POST = withErrorHandler(handleHealthCheck);
