import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withAuth(async function GET(request: NextRequest, _user) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("crypto_balances")
    .select("*")
    .order("symbol", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
});
