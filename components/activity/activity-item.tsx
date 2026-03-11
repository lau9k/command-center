"use client";

import {
  CheckCircle2,
  ArrowRightLeft,
  FileText,
  GitMerge,
  Brain,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectBadge } from "@/components/ui/badge";
import { activityEventTypeStyle, colors } from "@/lib/design-tokens";
import type { ActivityEventType, ActivityFeedItem } from "@/lib/types/database";

const eventIcons: Record<ActivityEventType, React.ComponentType<{ className?: string }>> = {
  task_completed: CheckCircle2,
  deal_moved: ArrowRightLeft,
  content_published: FileText,
  pr_merged: GitMerge,
  memory_flushed: Brain,
  system: Bell,
};

const eventLabels: Record<ActivityEventType, string> = {
  task_completed: "Task completed",
  deal_moved: "Deal moved",
  content_published: "Content published",
  pr_merged: "PR merged",
  memory_flushed: "Memory flushed",
  system: "System event",
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface ActivityItemCardProps {
  item: ActivityFeedItem;
  isLast?: boolean;
}

export function ActivityItemCard({ item, isLast }: ActivityItemCardProps) {
  const Icon = eventIcons[item.type] ?? Bell;
  const style = activityEventTypeStyle[item.type] ?? activityEventTypeStyle.system;

  return (
    <div className="relative flex gap-4 pb-6">
      {/* Vertical timeline line */}
      {!isLast && (
        <div className="absolute left-[17px] top-10 bottom-0 w-px bg-border" />
      )}

      {/* Icon circle */}
      <div
        className={cn(
          "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border",
          style.bg
        )}
      >
        <Icon className={cn("h-4 w-4", style.icon)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {item.title}
            </p>
            {item.description && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
            {relativeTime(item.created_at)}
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {eventLabels[item.type]}
          </span>
          {item.project_name && (
            <ProjectBadge color={item.project_color ?? colors.accent.purple}>
              {item.project_name}
            </ProjectBadge>
          )}
        </div>
      </div>
    </div>
  );
}
