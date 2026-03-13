import { NextRequest, NextResponse } from "next/server";

/**
 * Validates cron job authentication.
 * Accepts:
 * - Authorization: Bearer <CRON_SECRET> (Vercel's automatic cron header)
 * - x-cron-key header matching CRON_SECRET (manual triggers)
 *
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export function verifyCronAuth(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 401 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.replace("Bearer ", "");
  const cronKeyHeader = request.headers.get("x-cron-key");

  if (bearerToken === secret || cronKeyHeader === secret) {
    return null;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
