"use client";

import { useState, useMemo } from "react";
import { Users, Activity, UserPlus, Coins } from "lucide-react";
import { KpiCard } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { MemberCard, type Member } from "./MemberCard";
import { MemberSearch } from "./MemberSearch";
import { ActivityFeed, type ActivityEvent } from "./ActivityFeed";
import { GrowthChart, type GrowthDataPoint } from "./GrowthChart";

interface CommunityDashboardProps {
  members: Member[];
  events: ActivityEvent[];
  dailyGrowth: GrowthDataPoint[];
  weeklyGrowth: GrowthDataPoint[];
  kpis: {
    totalMembers: number;
    active7d: number;
    newThisWeek: number;
    avgHoldings: number;
  };
}

export function CommunityDashboard({
  members,
  events,
  dailyGrowth,
  weeklyGrowth,
  kpis,
}: CommunityDashboardProps) {
  const [search, setSearch] = useState("");

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.wallet_address.toLowerCase().includes(q)
    );
  }, [members, search]);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Members"
          value={kpis.totalMembers.toLocaleString()}
          icon={<Users className="size-5" />}
        />
        <KpiCard
          label="Active (7d)"
          value={kpis.active7d.toLocaleString()}
          icon={<Activity className="size-5" />}
        />
        <KpiCard
          label="New This Week"
          value={kpis.newThisWeek.toLocaleString()}
          icon={<UserPlus className="size-5" />}
        />
        <KpiCard
          label="Avg Holdings"
          value={kpis.avgHoldings.toLocaleString()}
          icon={<Coins className="size-5" />}
        />
      </div>

      {/* Main content: members grid + sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Members section (2/3) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <MemberSearch value={search} onChange={setSearch} />

          {filteredMembers.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title={search ? "No members found" : "No members yet"}
              description={
                search
                  ? "Try adjusting your search query"
                  : "Community members will appear here once they join"
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Activity feed + Growth chart (1/3) */}
        <div className="flex flex-col gap-6">
          <ActivityFeed events={events} />
          <GrowthChart dailyData={dailyGrowth} weeklyData={weeklyGrowth} />
        </div>
      </div>
    </div>
  );
}
