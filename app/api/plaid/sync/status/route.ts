import { NextResponse } from "next/server";
import { getLastSyncDate } from "@/lib/plaid-sync";

export const runtime = "nodejs";

export async function GET() {
  try {
    const lastSync = await getLastSyncDate();
    return NextResponse.json({ lastSync });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get sync status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
