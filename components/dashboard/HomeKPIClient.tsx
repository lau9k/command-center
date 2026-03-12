"use client";

import { useQuery } from "@tanstack/react-query";
import { KPIStrip } from "@/components/dashboard/KPIStrip";
import type { HomeStatsResponse } from "@/app/api/home-stats/route";

interface HomeKPIClientProps {
  initialData: HomeStatsResponse;
  communityMemberCount: number;
  communityDelta: number | null;
}

async function fetchHomeStats(): Promise<HomeStatsResponse> {
  const res = await fetch("/api/home-stats");
  if (!res.ok) throw new Error("Failed to fetch home stats");
  const json = await res.json();
  return json.data;
}

export function HomeKPIClient({
  initialData,
  communityMemberCount,
  communityDelta,
}: HomeKPIClientProps) {
  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: fetchHomeStats,
    initialData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // 60 seconds
  });

  return (
    <KPIStrip
      activeTasks={stats.activeTasks}
      activeProjectCount={stats.activeProjectCount}
      contentThisWeek={stats.contentThisWeek}
      contactsCount={stats.contactsCount}
      openInvoiceTotal={stats.openInvoiceTotal}
      memoryRecords={stats.memoryRecords}
      totalContentPosts={stats.totalContentPosts}
      contentDraftCount={stats.contentDraftCount}
      contentScheduledCount={stats.contentScheduledCount}
      contentPublishedCount={stats.contentPublishedCount}
      pipelineItemCount={stats.pipelineItemCount}
      pipelineTotalValue={stats.pipelineTotalValue}
      communityMemberCount={communityMemberCount}
      communityDelta={communityDelta}
      sponsorsTotal={stats.sponsorsTotal}
      sponsorsConfirmed={stats.sponsorsConfirmed}
      sponsorsConfirmedRevenue={stats.sponsorsConfirmedRevenue}
    />
  );
}
