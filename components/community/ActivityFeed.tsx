"use client";

import { useEffect, useState } from "react";
import { UserPlus, ArrowRightLeft, MessageCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { communityEventTypeColor } from "@/lib/design-tokens";
import type { CommunityEvent, CommunityEventType } from "@/lib/types/database";

export type ActivityEventType = CommunityEventType;

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  description: string;
  timestamp: string;
}

const EVENT_ICON: Record<ActivityEventType, React.ElementType> = {
  new_member: UserPlus,
  token_transfer: ArrowRightLeft,
  social_mention: MessageCircle,
};

const EVENT_BG: Record<ActivityEventType, string> = {
  new_member: "bg-[#22C55E]/10",
  token_transfer: "bg-[#3B82F6]/10",
  social_mention: "bg-[#A855F7]/10",
};

const EVENT_LABEL: Record<ActivityEventType, string> = {
  new_member: "New Member",
  token_transfer: "Transfer",
  social_mention: "Mention",
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function toActivityEvents(rows: CommunityEvent[]): ActivityEvent[] {
  return rows.map((r) => ({
    id: r.id,
    type: r.event_type,
    description: r.description ?? r.title,
    timestamp: r.created_at,
  }));
}

interface ActivityFeedProps {
  /** Pre-fetched events from the server (SSR). When provided the component skips its own fetch. */
  events?: ActivityEvent[];
  className?: string;
}

export function ActivityFeed({ events: serverEvents, className }: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>(serverEvents ?? []);
  const [loading, setLoading] = useState(!serverEvents);

  useEffect(() => {
    if (serverEvents) return;

    let cancelled = false;

    async function fetchEvents() {
      try {
        const res = await fetch("/api/community/events?pageSize=20");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setEvents(toActivityEvents(json.data ?? []));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEvents();
    return () => { cancelled = true; };
  }, [serverEvents]);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5",
        className
      )}
    >
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Activity Feed
      </h3>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No recent activity
        </p>
      ) : (
        <div className="flex flex-col">
          {events.map((event, i) => {
            const Icon = EVENT_ICON[event.type];
            const colorClass = communityEventTypeColor[event.type] ?? "text-muted-foreground";
            const bgClass = EVENT_BG[event.type];
            const isLast = i === events.length - 1;

            return (
              <div key={event.id} className="flex gap-3">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      bgClass
                    )}
                  >
                    <Icon className={cn("size-4", colorClass)} />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className={cn("flex-1 pb-4", isLast && "pb-0")}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground">
                      {event.description}
                    </p>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                        bgClass,
                        colorClass
                      )}
                    >
                      {EVENT_LABEL[event.type]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatRelativeTime(event.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
