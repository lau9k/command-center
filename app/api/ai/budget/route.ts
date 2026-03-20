import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { aiBudgetCheckSchema, aiBudgetRecordSchema } from "@/lib/validations";
import { checkBudget, recordUsage, getDailyBudgetStatus } from "@/lib/ai/budget";

// Hard-coded user ID for single-tenant usage (matches existing API pattern)
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const feature = searchParams.get("feature");
  const estimatedCostRaw = searchParams.get("estimated_cost");

  // If no feature param, return full daily status
  if (!feature) {
    const status = await getDailyBudgetStatus(DEFAULT_USER_ID);
    return NextResponse.json({ data: status });
  }

  const parsed = aiBudgetCheckSchema.safeParse({
    feature,
    estimated_cost: estimatedCostRaw ? Number(estimatedCostRaw) : undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const decision = await checkBudget(DEFAULT_USER_ID, parsed.data.feature, parsed.data.estimated_cost);
  return NextResponse.json({ data: decision });
});

export const PATCH = withErrorHandler(async function PATCH(request: NextRequest) {
  const body = await request.json();

  const parsed = aiBudgetRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  await recordUsage(DEFAULT_USER_ID, parsed.data.feature, parsed.data.tokens_used);
  const status = await getDailyBudgetStatus(DEFAULT_USER_ID);
  return NextResponse.json({ data: status });
});
