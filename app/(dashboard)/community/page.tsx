import { fetchCommunityMemberCount } from "@/lib/telegram/community";
import { CommunityDashboard } from "@/components/community/CommunityDashboard";
import type { Member } from "@/components/community/MemberCard";
import type { ActivityEvent } from "@/components/community/ActivityFeed";
import type { GrowthDataPoint } from "@/components/community/GrowthChart";

export const revalidate = 60;

// ── Placeholder data generators ─────────────────────────────────────────────
// These will be replaced with real Supabase queries once the community tables
// are created. For now they provide realistic preview data.

function generatePlaceholderMembers(): Member[] {
  const names = [
    "Alice Chen",
    "Bob Martinez",
    "Carol Williams",
    "David Kim",
    "Eve Johnson",
    "Frank Dubois",
    "Grace Nakamura",
    "Henry Okafor",
    "Irene Petrov",
    "Jake Thompson",
    "Kira Shah",
    "Leo Fernandez",
  ];

  return names.map((name, i) => ({
    id: `member-${i + 1}`,
    name,
    wallet_address: `0x${(i + 1).toString(16).padStart(4, "0")}${"a".repeat(36)}${(i + 1).toString(16).padStart(4, "0")}`,
    joined_date: new Date(
      Date.now() - (names.length - i) * 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
    mass_held: Math.floor(1000 + Math.random() * 49000),
  }));
}

function generatePlaceholderEvents(): ActivityEvent[] {
  const events: ActivityEvent[] = [
    {
      id: "evt-1",
      type: "new_member",
      description: "Kira Shah joined the community",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "evt-2",
      type: "token_transfer",
      description: "10,000 MASS transferred to 0x3f...a2c1",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "evt-3",
      type: "social_mention",
      description: "Community mentioned in @basecamp77 tweet",
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "evt-4",
      type: "new_member",
      description: "Leo Fernandez joined the community",
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "evt-5",
      type: "token_transfer",
      description: "5,000 MASS transferred to 0x7b...d4e9",
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "evt-6",
      type: "social_mention",
      description: "Community highlighted in Telegram discussion",
      timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return events;
}

function generateGrowthData(): {
  daily: GrowthDataPoint[];
  weekly: GrowthDataPoint[];
} {
  const daily: GrowthDataPoint[] = [];
  const weekly: GrowthDataPoint[] = [];
  const now = new Date();
  let holders = 80;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    holders += Math.floor(Math.random() * 5) + 1;
    daily.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      holders,
    });
  }

  let weekHolders = 40;
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    weekHolders += Math.floor(Math.random() * 20) + 5;
    weekly.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      holders: weekHolders,
    });
  }

  return { daily, weekly };
}

export default async function CommunityPage() {
  const communityMemberCount = await fetchCommunityMemberCount();

  const members = generatePlaceholderMembers();
  const events = generatePlaceholderEvents();
  const growthData = generateGrowthData();

  // Compute KPI values
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const newThisWeek = members.filter(
    (m) => new Date(m.joined_date) >= oneWeekAgo
  ).length;

  const totalMembers =
    communityMemberCount > 0 ? communityMemberCount : members.length;
  const avgHoldings =
    members.length > 0
      ? Math.round(
          members.reduce((sum, m) => sum + m.mass_held, 0) / members.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Community</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Members, activity, and growth metrics for your community
        </p>
      </div>

      <CommunityDashboard
        members={members}
        events={events}
        dailyGrowth={growthData.daily}
        weeklyGrowth={growthData.weekly}
        kpis={{
          totalMembers,
          active7d: Math.round(totalMembers * 0.6),
          newThisWeek,
          avgHoldings,
        }}
      />
    </div>
  );
}
