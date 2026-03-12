import { NextRequest, NextResponse } from "next/server";
import { syncTransactions } from "@/lib/plaid-sync";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const cronKey = process.env.CRON_KEY;
  const headerKey = request.headers.get("x-cron-key");

  if (!cronKey || headerKey !== cronKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncTransactions();
  return NextResponse.json(result);
}

export async function POST() {
  try {
    const result = await syncTransactions();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
