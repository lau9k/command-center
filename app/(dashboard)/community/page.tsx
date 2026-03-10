import { fetchCommunityMemberCount } from "@/lib/telegram/community";
import { createServiceClient } from "@/lib/supabase/service";
import { CommunityDashboard } from "@/components/community/CommunityDashboard";
import type { Member } from "@/components/community/MemberCard";
import type { ActivityEvent } from "@/components/community/ActivityFeed";
import type { GrowthDataPoint } from "@/components/community/GrowthChart";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const supabase = createServiceClient();

  // Fetch live Telegram member count, stored members, cached stats, and latest fetch time in parallel
  const [communityMemberCount, membersRes, statsHistoryRes, latestStatsRes] =
    await Promise.all([
      fetchCommunityMemberCount(),
      supabase
        .from("community_members")
        .select("id, name, wallet_address, joined_date, mass_held")
        .order("joined_date", { ascending: false }),
      supabase
        .from("community_stats")
        .select("member_count, fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(30),
      supabase
        .from("community_stats")
        .select("fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .single(),
    ]);

  const members: Member[] = (membersRes.data ?? []).map((m) => ({
    id: m.id,
    name: m.name ?? "Anonymous",
    wallet_address: m.wallet_address ?? "",
    joined_date: m.joined_date ?? new Date().toISOString(),
    mass_held: m.mass_held ?? 0,
  }));

  // Use live Telegram count as primary source, fall back to DB member count
  const totalMembers =
    communityMemberCount > 0 ? communityMemberCount : members.length;

  // Compute KPIs from real member data when available
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newThisWeek = members.filter(
    (m) => new Date(m.joined_date) >= oneWeekAgo
  ).length;
  const avgHoldings =
    members.length > 0
      ? Math.round(
          members.reduce((sum, m) => sum + m.mass_held, 0) / members.length
        )
      : 0;

  // Activity events — empty until community_events table exists
  const events: ActivityEvent[] = [];

  // Build growth data from community_stats cache history
  const statsHistory = statsHistoryRes.data ?? [];
  const dailyGrowth: GrowthDataPoint[] = statsHistory
    .map((s) => ({
      date: new Date(s.fetched_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      holders: s.member_count,
    }))
    .reverse();

  // Weekly: group by week and take the last snapshot per week
  const weeklyMap = new Map<string, GrowthDataPoint>();
  for (const s of statsHistory) {
    const d = new Date(s.fetched_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = weekStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, { date: weekKey, holders: s.member_count });
    }
  }
  const weeklyGrowth: GrowthDataPoint[] = Array.from(weeklyMap.values()).reverse();

  // Last-updated timestamp from cached stats
  const lastUpdated = latestStatsRes.data?.fetched_at ?? null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Community</h1>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Last updated:{" "}
              {new Date(lastUpdated).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Members, activity, and growth metrics for your community
        </p>
      </div>

      <CommunityDashboard
        members={members}
        events={events}
        dailyGrowth={dailyGrowth}
        weeklyGrowth={weeklyGrowth}
        kpis={{
          totalMembers,
          active7d: members.length,
          newThisWeek,
          avgHoldings,
        }}
      />
    </div>
  );
}
