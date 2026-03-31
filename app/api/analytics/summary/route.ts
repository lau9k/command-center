import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { getAnalyticsSummary } from "@/lib/analytics/get-summary";

export type { AnalyticsSummaryResponse } from "@/lib/analytics/get-summary";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "30d";
  const compare = searchParams.get("compare") === "true";

  const response = await getAnalyticsSummary(supabase, period, compare);
  return NextResponse.json(response);
});
