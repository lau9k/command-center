"use client";

import { format, parseISO } from "date-fns";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ContentPost } from "@/lib/types/database";
import { PLATFORM_COLORS } from "@/lib/types/database";

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-[#666666]/20", text: "text-[#666666]", label: "Draft" },
  scheduled: { bg: "bg-[#3B82F6]/20", text: "text-[#3B82F6]", label: "Scheduled" },
  published: { bg: "bg-[#22C55E]/20", text: "text-[#22C55E]", label: "Published" },
  failed: { bg: "bg-[#EF4444]/20", text: "text-[#EF4444]", label: "Failed" },
};

interface MeekPostCardProps {
  post: ContentPost;
  onClick: () => void;
  compact?: boolean;
}

export function MeekPostCard({ post, onClick, compact = false }: MeekPostCardProps) {
  const caption = post.caption ?? post.body ?? post.title ?? "Untitled";
  const displayCaption = caption.length > 80 ? caption.slice(0, 80) + "…" : caption;
  const platforms = post.platforms?.length ? post.platforms : post.platform ? [post.platform] : [];
  const scheduledTime = post.scheduled_at ?? post.scheduled_for;
  const statusConfig = STATUS_PILL[post.status] ?? STATUS_PILL.draft;
  const imageUrl = post.image_url ?? post.media_urls?.[0] ?? null;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-md border border-border bg-card p-1.5 text-left transition-colors hover:border-ring"
      >
        <div className="flex items-center gap-1.5">
          {platforms.map((p) => (
            <span
              key={p}
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: PLATFORM_COLORS[p] ?? "#666" }}
            />
          ))}
          <span className="truncate text-xs text-foreground">{post.title ?? displayCaption}</span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-card p-2.5 text-left transition-all hover:border-ring hover:shadow-sm"
    >
      <div className="flex gap-2.5">
        {/* Image thumbnail */}
        {imageUrl && (
          <div className="size-12 shrink-0 overflow-hidden rounded-md bg-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="size-full object-cover" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Caption */}
          <p className="text-sm text-foreground leading-snug line-clamp-2">
            {displayCaption}
          </p>

          {/* Platform dots + Status pill */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex items-center gap-1">
              {platforms.map((p) => (
                <span
                  key={p}
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: PLATFORM_COLORS[p] ?? "#666" }}
                  title={p}
                />
              ))}
            </div>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none",
                statusConfig.bg,
                statusConfig.text
              )}
            >
              {statusConfig.label}
            </span>
          </div>

          {/* Scheduled time */}
          {scheduledTime && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              {format(parseISO(scheduledTime), "h:mm a")}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
