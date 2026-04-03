import { NextRequest, NextResponse } from "next/server";
import { syncContactMemoryStats } from "@/lib/personize/sync-stats";
import { withErrorHandler } from "@/lib/api-error-handler";
import { syncStatsSchema } from "@/lib/validations";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === process.env.API_SECRET;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = syncStatsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const result = await syncContactMemoryStats(parsed.data.projectId);
  return NextResponse.json({ success: true, ...result });
});
