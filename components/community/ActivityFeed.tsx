"use client";

import { UserPlus, ArrowRightLeft, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { communityEventTypeColor } from "@/lib/design-tokens";

export type ActivityEventType = "new_member" | "token_transfer" | "social_mention";

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

interface ActivityFeedProps {
  events: ActivityEvent[];
  className?: string;
}

export function ActivityFeed({ events, className }: ActivityFeedProps) {
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

      {events.length === 0 ? (
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
                  <p className="text-sm text-foreground">
                    {event.description}
                  </p>
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
