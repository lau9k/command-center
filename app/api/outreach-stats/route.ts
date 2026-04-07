import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export interface OutreachStats {
  queued: number;
  sent: number;
  replied: number;
  no_response: number;
  skipped: number;
  total: number;
}

export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("outreach_status")
    .eq("task_type", "outreach");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const stats: OutreachStats = {
    queued: 0,
    sent: 0,
    replied: 0,
    no_response: 0,
    skipped: 0,
    total: rows.length,
  };

  for (const row of rows) {
    const status = row.outreach_status as keyof Omit<OutreachStats, "total">;
    if (status in stats) {
      stats[status]++;
    }
  }

  return NextResponse.json(stats);
}));
