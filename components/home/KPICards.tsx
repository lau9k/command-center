"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Layers,
  CheckSquare,
  Calendar,
  FileText,
  Bell,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

const REFRESH_INTERVAL_MS = 60_000;

const ACCENT = {
  blue: "#3B82F6",
  green: "#22C55E",
  purple: "#A855F7",
  amber: "#F59E0B",
  indigo: "#6366F1",
  red: "#EF4444",
} as const;

interface KPIData {
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

interface KPICardsProps {
  initial: KPIData;
}

/** Generate deterministic sparkline data (7 points) from a current value. */
function makeSparkline(current: number, seed: number): { v: number }[] {
  const points: { v: number }[] = [];
  const base = Math.max(current, 1);
  let s = seed;
  for (let i = 0; i < 7; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const variance = 0.6 + (s % 100) / 125;
    const val = Math.max(0, Math.round(base * variance));
    points.push({ v: val });
  }
  points[6] = { v: current };
  return points;
}

function MiniSparkline({ data, color }: { data: { v: number }[]; color: string }) {
  const gradientId = `kpi-spark-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width={72} height={28}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function TrendIndicator({ value }: { value: number | null }) {
  if (value === null || value === 0) return null;
  const isUp = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isUp ? "text-[#22C55E]" : "text-[#EF4444]"
      }`}
    >
      {isUp ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function formatTimeAgo(isoString: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function KPICards({ initial }: KPICardsProps) {
  const router = useRouter();
  const [data, setData] = useState<KPIData>(initial);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());
  const [, setTick] = useState(0);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/home-stats");
      if (res.ok) {
        const json = (await res.json()) as {
          data: {
            contactsCount: number;
            pipelineItemCount: number;
            pipelineTotalValue: number;
            overdueTasks: number;
            activeTasks: number;
            contentScheduledCount: number;
            upcomingMeetings: { id: string }[];
            lastUpdated: string;
          };
        };
        const s = json.data;
        setData({
          totalContacts: s.contactsCount,
          openDeals: s.pipelineItemCount,
          pipelineTotalValue: s.pipelineTotalValue,
          tasksDueToday: s.activeTasks,
          meetingsThisWeek: s.upcomingMeetings?.length ?? 0,
          contentScheduled: s.contentScheduledCount,
          unreadNotifications: 0,
          contactsTrend: null,
          dealsTrend: null,
          tasksTrend: null,
          meetingsTrend: null,
          contentTrend: null,
          notificationsTrend: null,
        });
        setLastUpdated(s.lastUpdated);
      }
    } catch {
      // Keep showing last known data
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const tick = setInterval(() => setTick((n) => n + 1), 15_000);
    return () => clearInterval(tick);
  }, []);

  const sparklines = useMemo(
    () => ({
      contacts: makeSparkline(data.totalContacts, 1),
      deals: makeSparkline(data.openDeals, 2),
      tasks: makeSparkline(data.tasksDueToday, 3),
      meetings: makeSparkline(data.meetingsThisWeek, 4),
      content: makeSparkline(data.contentScheduled, 5),
      notifications: makeSparkline(data.unreadNotifications, 6),
    }),
    [data]
  );

  const cards = [
    {
      label: "Total Contacts",
      value: data.totalContacts,
      trend: data.contactsTrend,
      icon: <Users className="size-5" />,
      accent: ACCENT.indigo,
      sparkline: sparklines.contacts,
      href: "/contacts",
    },
    {
      label: "Open Deals",
      value: data.openDeals,
      subtitle:
        data.pipelineTotalValue > 0
          ? `$${data.pipelineTotalValue.toLocaleString()} pipeline`
          : undefined,
      trend: data.dealsTrend,
      icon: <Layers className="size-5" />,
      accent: ACCENT.amber,
      sparkline: sparklines.deals,
      href: "/pipeline",
    },
    {
      label: "Tasks Due Today",
      value: data.tasksDueToday,
      trend: data.tasksTrend,
      icon: <CheckSquare className="size-5" />,
      accent: ACCENT.blue,
      sparkline: sparklines.tasks,
      href: "/tasks",
    },
    {
      label: "Meetings This Week",
      value: data.meetingsThisWeek,
      trend: data.meetingsTrend,
      icon: <Calendar className="size-5" />,
      accent: ACCENT.green,
      sparkline: sparklines.meetings,
      href: "/meetings",
    },
    {
      label: "Content Scheduled",
      value: data.contentScheduled,
      trend: data.contentTrend,
      icon: <FileText className="size-5" />,
      accent: ACCENT.purple,
      sparkline: sparklines.content,
      href: "/content",
    },
    {
      label: "Unread Notifications",
      value: data.unreadNotifications,
      trend: data.notificationsTrend,
      icon: <Bell className="size-5" />,
      accent: ACCENT.red,
      sparkline: sparklines.notifications,
      href: "/settings/notifications",
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Key Metrics</h2>
        {isRefreshing ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <button
            type="button"
            onClick={fetchData}
            className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:size-auto sm:p-1"
            aria-label="Refresh metrics"
          >
            <RefreshCw className="size-4" />
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          Updated {formatTimeAgo(lastUpdated)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            onClick={() => router.push(card.href)}
            className="flex cursor-pointer flex-col gap-3 rounded-lg border border-border border-l-4 bg-card p-4 transition-all duration-150 hover:border-ring/50 hover:bg-card-hover hover:shadow-md dark:bg-card dark:hover:bg-card-hover"
            style={{ borderLeftColor: card.accent }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                {card.label}
              </span>
              <span className="text-muted-foreground dark:text-muted-foreground">{card.icon}</span>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-bold leading-none tracking-tight text-foreground dark:text-foreground sm:text-[32px]">
                  {card.value}
                </span>
                <TrendIndicator value={card.trend} />
                {card.subtitle && (
                  <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                    {card.subtitle}
                  </span>
                )}
              </div>
              <div className="shrink-0">
                <MiniSparkline data={card.sparkline} color={card.accent} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Helper to build initial KPIData from HomeStatsResponse on the server. */
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
