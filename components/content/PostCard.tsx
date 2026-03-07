"use client";

import { format } from "date-fns";
import { Clock, Eye, Heart, MessageCircle, GripVertical } from "lucide-react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { StatusBadge, PlatformBadge } from "@/components/ui";
import type { PlatformType, StatusType } from "@/components/ui";
import type { ContentPost } from "@/lib/types/database";

const VALID_PLATFORMS = new Set<string>([
  "linkedin",
  "twitter",
  "youtube",
  "instagram",
  "tiktok",
]);

interface PostCardProps {
  post: ContentPost;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onClick?: (post: ContentPost) => void;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export function PostCard({
  post,
  selected,
  onSelect,
  onClick,
  dragHandleProps,
}: PostCardProps) {
  const caption = post.body ?? post.title ?? "Untitled post";
  const platform = post.platform;
  const isValidPlatform = platform && VALID_PLATFORMS.has(platform);
  const metrics = post.metrics as Record<string, number> | null;
  const hasMetrics =
    post.status === "published" && metrics && Object.keys(metrics).length > 0;
  const thumbnail = post.media_urls?.[0] ?? null;

  return (
    <div
      className={cn(
        "group rounded-lg border border-[#2A2A2A] bg-[#141414] p-3 transition-colors hover:border-[#3A3A3A]",
        selected && "border-[#3B82F6] bg-[#3B82F6]/5"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="mt-0.5 cursor-grab text-[#666666] opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </div>

        {/* Checkbox for bulk select */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(post.id);
          }}
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
            selected
              ? "border-[#3B82F6] bg-[#3B82F6]"
              : "border-[#2A2A2A] hover:border-[#3A3A3A]"
          )}
        >
          {selected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Card body */}
        <button
          type="button"
          onClick={() => onClick?.(post)}
          className="flex-1 text-left min-w-0"
        >
          {/* Thumbnail */}
          {thumbnail && (
            <div className="mb-2 h-24 w-full overflow-hidden rounded-md bg-[#1E1E1E]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnail}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Caption - 2 lines max */}
          <p className="text-sm text-[#FAFAFA] line-clamp-2 leading-snug">
            {caption}
          </p>

          {/* Platform + Status row */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {isValidPlatform && (
              <PlatformBadge platform={platform as PlatformType} />
            )}
            <StatusBadge status={post.status as StatusType} />
          </div>

          {/* Scheduled time */}
          {post.scheduled_for && (
            <div className="mt-2 flex items-center gap-1 text-xs text-[#A0A0A0]">
              <Clock className="size-3" />
              {format(new Date(post.scheduled_for), "MMM d, h:mm a")}
            </div>
          )}

          {/* Published metrics */}
          {hasMetrics && (
            <div className="mt-2 flex items-center gap-3 text-xs text-[#A0A0A0]">
              {metrics.impressions !== undefined && (
                <span className="flex items-center gap-1">
                  <Eye className="size-3" />
                  {metrics.impressions.toLocaleString()}
                </span>
              )}
              {metrics.likes !== undefined && (
                <span className="flex items-center gap-1">
                  <Heart className="size-3" />
                  {metrics.likes.toLocaleString()}
                </span>
              )}
              {metrics.comments !== undefined && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="size-3" />
                  {metrics.comments.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
