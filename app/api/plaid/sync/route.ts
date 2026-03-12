import { NextRequest, NextResponse } from "next/server";
import { syncTransactions } from "@/lib/plaid-sync";
import { verifyCronAuth } from "@/lib/cron-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const result = await syncTransactions();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const result = await syncTransactions();
  return NextResponse.json(result);
}
