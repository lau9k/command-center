import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withErrorHandler(withAuth(async function GET(_request, user) {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("get_daily_briefing", {
    p_user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}));
