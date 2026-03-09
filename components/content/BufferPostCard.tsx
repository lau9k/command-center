"use client";

import { format, parseISO } from "date-fns";

import { cn } from "@/lib/utils";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/types/database";
import type { ContentPost } from "@/lib/types/database";
import { colors } from "@/lib/design-tokens";

const STATUS_DOTS: Record<string, string> = {
  published: colors.accent.green,
  scheduled: colors.accent.yellow,
  draft: colors.text.primary,
  failed: colors.accent.red,
};

interface BufferPostCardProps {
  post: ContentPost & {
    projects?: { id: string; name: string; color: string | null } | null;
  };
  compact?: boolean;
  onClick: () => void;
}

export function BufferPostCard({ post, compact, onClick }: BufferPostCardProps) {
  const platforms = post.platforms?.length ? post.platforms : post.platform ? [post.platform] : [];
  const primaryPlatform = platforms[0];
  const platformColor = primaryPlatform ? PLATFORM_COLORS[primaryPlatform] ?? "#666" : "#666";
  const statusColor = STATUS_DOTS[post.status] ?? "#666";
  const caption = post.caption ?? post.body ?? post.title ?? "Untitled";
  const time = post.scheduled_at ?? post.scheduled_for;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full items-center gap-1.5 rounded-md bg-[#1A1A1A] px-2 py-1 text-left transition-colors hover:bg-[#222]"
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: platformColor }}
          title={primaryPlatform ? PLATFORM_LABELS[primaryPlatform] : undefined}
        />
        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
          {caption}
        </span>
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: statusColor }}
          title={post.status}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full gap-2 rounded-lg bg-[#1A1A1A] p-2 text-left transition-colors hover:bg-[#222]"
    >
      {/* Thumbnail */}
      {post.image_url && (
        <div className="size-10 shrink-0 overflow-hidden rounded-md bg-[#2A2A2A]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.image_url}
            alt=""
            className="size-full object-cover"
          />
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* Platform icons + status dot */}
        <div className="mb-0.5 flex items-center gap-1.5">
          {platforms.map((p) => (
            <span
              key={p}
              className="size-2.5 rounded-full"
              style={{ backgroundColor: PLATFORM_COLORS[p] ?? "#666" }}
              title={PLATFORM_LABELS[p]}
            />
          ))}
          <span
            className="ml-auto size-2 rounded-full"
            style={{ backgroundColor: statusColor }}
            title={post.status}
          />
        </div>

        {/* Caption (2 lines) */}
        <p
          className={cn(
            "text-xs leading-snug text-foreground",
            "line-clamp-2"
          )}
        >
          {caption}
        </p>

        {/* Time */}
        {time && (
          <span className="mt-0.5 text-[10px] text-muted-foreground">
            {format(parseISO(time), "h:mm a")}
          </span>
        )}
      </div>
    </button>
  );
}
