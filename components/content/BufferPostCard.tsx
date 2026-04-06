"use client";

import { formatDistanceToNow, parseISO, isToday, isTomorrow, format } from "date-fns";

import { cn } from "@/lib/utils";
import type { ContentPost } from "@/lib/types/database";
import { PlatformIcon } from "@/components/ui/platform-icon";
import {
  ContentStatusBadge,
  type ContentStatus,
} from "@/components/ui/status-badge";

interface BufferPostCardProps {
  post: ContentPost & {
    projects?: { id: string; name: string; color: string | null } | null;
  };
  compact?: boolean;
  onClick: () => void;
  isDragging?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const date = parseISO(dateStr);
  const now = new Date();

  if (date < now) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  if (isToday(date)) {
    return `today ${format(date, "h:mm a")}`;
  }

  if (isTomorrow(date)) {
    return `tomorrow ${format(date, "h:mm a")}`;
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

export function BufferPostCard({
  post,
  compact,
  onClick,
  isDragging,
}: BufferPostCardProps) {
  const platforms =
    post.platforms?.length > 0
      ? post.platforms
      : post.platform
        ? [post.platform]
        : [];
  const caption = post.caption ?? post.body ?? post.title ?? "Untitled";
  const time = post.scheduled_for;
  const status = post.status as ContentStatus;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors",
          "bg-card hover:bg-accent/50",
          "dark:bg-neutral-900 dark:hover:bg-neutral-800",
          isDragging && "shadow-lg ring-2 ring-blue-500/40 dark:ring-blue-400/40"
        )}
      >
        {platforms[0] && (
          <PlatformIcon platform={platforms[0]} size="sm" />
        )}
        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
          {caption}
        </span>
        <ContentStatusBadge status={status} className="scale-90" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col rounded-lg p-3 text-left transition-colors",
        "bg-card hover:bg-accent/50 border border-border",
        "dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800",
        isDragging && "shadow-lg ring-2 ring-blue-500/40 dark:ring-blue-400/40",
        "min-w-[280px] max-w-[320px]"
      )}
    >
      {/* Header: Platform icons + status badge */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {platforms.map((p) => (
            <PlatformIcon key={p} platform={p} size="sm" />
          ))}
        </div>
        <ContentStatusBadge status={status} />
      </div>

      {/* Thumbnail + caption */}
      <div className="flex gap-2">
        {post.image_url && (
          <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt={post.title || "Post image"}
              className="size-full object-cover"
            />
          </div>
        )}
        <p
          className={cn(
            "min-w-0 flex-1 text-xs leading-snug text-foreground",
            "line-clamp-2"
          )}
        >
          {caption}
        </p>
      </div>

      {/* Relative time */}
      {time && (
        <span className="mt-2 text-[10px] text-muted-foreground">
          {formatRelativeTime(time)}
        </span>
      )}
    </button>
  );
}
