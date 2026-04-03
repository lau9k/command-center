import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withAuth(async function GET(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "true";

  // Optionally refresh the materialized view
  if (refresh) {
    const { error: refreshError } = await supabase.rpc(
      "refresh_wallet_pnl_monthly"
    );
    if (refreshError) {
      return NextResponse.json(
        { error: refreshError.message },
        { status: 500 }
      );
    }
  }

  const { data, error } = await supabase
    .from("wallet_pnl_monthly")
    .select("*")
    .order("month", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
});
