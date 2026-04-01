/**
 * Shared KPI data types and builder — importable from both server and client modules.
 * Extracted from KPICards.tsx to avoid RSC boundary violations.
 */

export interface KPIData {
  totalContacts: number;
  openDeals: number;
  pipelineTotalValue: number;
  tasksDueToday: number;
  meetingsThisWeek: number;
  contentScheduled: number;
  unreadNotifications: number;
  // Trend data (percentage change)
  contactsTrend: number | null;
  dealsTrend: number | null;
  tasksTrend: number | null;
  meetingsTrend: number | null;
  contentTrend: number | null;
  notificationsTrend: number | null;
}

/** Build initial KPIData from HomeStatsResponse on the server. */
export function buildKPIData(stats: {
  contactsCount: number;
  pipelineItemCount: number;
  pipelineTotalValue: number;
  activeTasks: number;
  contentScheduledCount: number;
  upcomingMeetings: { id: string }[];
}): KPIData {
  return {
    totalContacts: stats.contactsCount,
    openDeals: stats.pipelineItemCount,
    pipelineTotalValue: stats.pipelineTotalValue,
    tasksDueToday: stats.activeTasks,
    meetingsThisWeek: stats.upcomingMeetings?.length ?? 0,
    contentScheduled: stats.contentScheduledCount,
    unreadNotifications: 0,
    contactsTrend: null,
    dealsTrend: null,
    tasksTrend: null,
    meetingsTrend: null,
    contentTrend: null,
    notificationsTrend: null,
  };
}
