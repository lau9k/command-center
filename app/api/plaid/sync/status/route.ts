import { NextResponse } from "next/server";
import { getLastSyncDate } from "@/lib/plaid-sync";
import { withAuth } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

export const GET = withAuth(async function GET(_request, _user) {
  try {
    const lastSync = await getLastSyncDate();
    return NextResponse.json({ lastSync });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get sync status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
