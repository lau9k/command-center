import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateIdParam } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";

export interface SponsorMetricsResponse {
  total_amount: number;
  currency: string;
  event_count: number;
  outreach_stats: {
    total: number;
    sent: number;
    replied: number;
    no_response: number;
    follow_up_needed: number;
  };
  engagement_score: number;
  monthly_values: { month: string; amount: number }[];
}

export const GET = withErrorHandler(async function GET(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) {
  const { id } = (await context?.params) ?? {};

  if (!validateIdParam(id ?? null)) {
    return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const [
    { data: sponsor, error: sponsorError },
    { data: outreach },
  ] = await Promise.all([
    supabase.from("sponsors").select("amount, currency, event_id, status, outreach_status, created_at").eq("id", id).single(),
    supabase
      .from("sponsor_outreach")
      .select("status, contacted_at")
      .eq("sponsor_id", id),
  ]);

  if (sponsorError) {
    const status = sponsorError.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: sponsorError.message }, { status });
  }

  // Count events this sponsor is linked to
  const eventCount = sponsor.event_id ? 1 : 0;

  // Compute outreach stats
  const outreachList = outreach ?? [];
  const outreachStats = {
    total: outreachList.length,
    sent: outreachList.filter((o) => o.status === "sent").length,
    replied: outreachList.filter((o) => o.status === "replied").length,
    no_response: outreachList.filter((o) => o.status === "no_response").length,
    follow_up_needed: outreachList.filter((o) => o.status === "follow_up_needed").length,
  };

  // Compute engagement score (0-100) based on activity signals
  let score = 0;
  if (sponsor.status === "confirmed") score += 40;
  else if (sponsor.status === "negotiating") score += 25;
  else if (sponsor.status === "contacted") score += 10;
  if (sponsor.outreach_status === "converted") score += 20;
  else if (sponsor.outreach_status === "replied") score += 15;
  else if (sponsor.outreach_status === "sent") score += 5;
  score += Math.min(outreachStats.total * 5, 20);
  if (outreachStats.replied > 0) score += 10;
  if (Number(sponsor.amount) > 0) score += 10;
  score = Math.min(score, 100);

  // Build monthly values from sponsor creation + outreach activity
  const monthlyMap = new Map<string, number>();
  const createdDate = new Date(sponsor.created_at);
  const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;
  monthlyMap.set(monthKey, Number(sponsor.amount) || 0);

  // Add outreach activity months (contribution spread or just mark activity)
  for (const o of outreachList) {
    const d = new Date(o.contacted_at);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap.has(mk)) {
      monthlyMap.set(mk, 0);
    }
  }

  const monthlyValues = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  const response: SponsorMetricsResponse = {
    total_amount: Number(sponsor.amount) || 0,
    currency: sponsor.currency ?? "USD",
    event_count: eventCount,
    outreach_stats: outreachStats,
    engagement_score: score,
    monthly_values: monthlyValues,
  };

  return NextResponse.json({ data: response });
});
