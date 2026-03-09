import { NextRequest, NextResponse } from "next/server";
import { syncMemoryStats } from "@/lib/personize/sync-stats";
import { syncStatsSchema } from "@/lib/validations";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === process.env.API_SECRET;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = syncStatsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { projectId } = parsed.data;

    const result = await syncMemoryStats(projectId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[API] /api/personize/sync-stats failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
