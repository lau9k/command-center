"use client";

import { cn } from "@/lib/utils";
import type { ContentPost } from "@/lib/types/database";
import { PlatformIcon } from "@/components/ui/platform-icon";
import {
  ContentStatusBadge,
  type ContentStatus,
} from "@/components/ui/status-badge";

interface CalendarPostCardProps {
  post: ContentPost & {
    projects?: { id: string; name: string; color: string | null } | null;
  };
  onClick: () => void;
  isDragging?: boolean;
}

export function CalendarPostCard({
  post,
  onClick,
  isDragging,
}: CalendarPostCardProps) {
  const platforms =
    post.platforms?.length > 0
      ? post.platforms
      : post.platform
        ? [post.platform]
        : [];
  const title = post.title ?? post.caption ?? post.body ?? "Untitled";
  const status = post.status as ContentStatus;
  const projectColor = post.projects?.color ?? null;
  const projectName = post.projects?.name ?? null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors",
        "bg-card hover:bg-accent/50",
        "dark:bg-neutral-900 dark:hover:bg-neutral-800",
        isDragging && "shadow-lg ring-2 ring-blue-500/40 dark:ring-blue-400/40"
      )}
    >
      {/* Project color indicator */}
      {projectColor && (
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: projectColor }}
          title={projectName ?? undefined}
        />
      )}

      {/* Platform icon */}
      {platforms[0] && (
        <PlatformIcon platform={platforms[0]} size="sm" />
      )}

      {/* Title (truncated) */}
      <span className="min-w-0 flex-1 truncate text-[11px] leading-tight text-foreground">
        {title}
      </span>

      {/* Status badge */}
      <ContentStatusBadge status={status} className="scale-[0.85]" />
    </button>
  );
}
