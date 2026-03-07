"use client";

import { format } from "date-fns";
import { Clock, Eye, Heart, MessageCircle, Image } from "lucide-react";
import { Drawer } from "@/components/ui";
import { StatusBadge, PlatformBadge } from "@/components/ui";
import type { PlatformType, StatusType } from "@/components/ui";
import { Button } from "@/components/ui/button";
import type { ContentPost, ContentPostStatus } from "@/lib/types/database";

const VALID_PLATFORMS = new Set<string>([
  "linkedin",
  "twitter",
  "youtube",
  "instagram",
  "tiktok",
]);

const STATUS_TRANSITIONS: Record<ContentPostStatus, ContentPostStatus | null> = {
  draft: "ready",
  ready: "scheduled",
  scheduled: "published",
  published: null,
};

interface PostDetailDrawerProps {
  post: ContentPost | null;
  onClose: () => void;
  onStatusChange: (id: string, status: ContentPostStatus) => void;
}

export function PostDetailDrawer({
  post,
  onClose,
  onStatusChange,
}: PostDetailDrawerProps) {
  if (!post) return <Drawer open={false} onClose={onClose}><div /></Drawer>;

  const nextStatus = STATUS_TRANSITIONS[post.status];
  const platform = post.platform;
  const isValidPlatform = platform && VALID_PLATFORMS.has(platform);
  const metrics = post.metrics as Record<string, number> | null;
  const hasMetrics =
    post.status === "published" && metrics && Object.keys(metrics).length > 0;

  return (
    <Drawer
      open={!!post}
      onClose={onClose}
      title={post.title ?? "Post Details"}
      footer={
        nextStatus ? (
          <Button
            onClick={() => onStatusChange(post.id, nextStatus)}
            className="w-full"
          >
            Move to {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        {/* Status + Platform */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={post.status as StatusType} />
          {isValidPlatform && (
            <PlatformBadge platform={platform as PlatformType} />
          )}
          {post.type && (
            <span className="text-xs text-[#A0A0A0]">
              {post.type}
            </span>
          )}
        </div>

        {/* Body */}
        {post.body && (
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-[#666666]">
              Caption
            </h4>
            <p className="whitespace-pre-wrap text-sm text-[#FAFAFA] leading-relaxed">
              {post.body}
            </p>
          </div>
        )}

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#666666]">
              Media
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {post.media_urls.map((url, i) => (
                <div
                  key={i}
                  className="flex h-28 items-center justify-center overflow-hidden rounded-md bg-[#1E1E1E]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {post.media_urls?.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-[#666666]">
            <Image className="size-4" />
            No media attached
          </div>
        )}

        {/* Scheduled time */}
        {post.scheduled_for && (
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-[#666666]">
              Scheduled For
            </h4>
            <div className="flex items-center gap-1.5 text-sm text-[#FAFAFA]">
              <Clock className="size-4 text-[#A0A0A0]" />
              {format(new Date(post.scheduled_for), "EEEE, MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        )}

        {/* Metrics (published) */}
        {hasMetrics && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[#666666]">
              Performance
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {metrics.impressions !== undefined && (
                <div className="rounded-lg bg-[#1E1E1E] p-3 text-center">
                  <Eye className="mx-auto mb-1 size-4 text-[#A0A0A0]" />
                  <p className="text-lg font-semibold text-[#FAFAFA]">
                    {metrics.impressions.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#666666]">Impressions</p>
                </div>
              )}
              {metrics.likes !== undefined && (
                <div className="rounded-lg bg-[#1E1E1E] p-3 text-center">
                  <Heart className="mx-auto mb-1 size-4 text-[#A0A0A0]" />
                  <p className="text-lg font-semibold text-[#FAFAFA]">
                    {metrics.likes.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#666666]">Likes</p>
                </div>
              )}
              {metrics.comments !== undefined && (
                <div className="rounded-lg bg-[#1E1E1E] p-3 text-center">
                  <MessageCircle className="mx-auto mb-1 size-4 text-[#A0A0A0]" />
                  <p className="text-lg font-semibold text-[#FAFAFA]">
                    {metrics.comments.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#666666]">Comments</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="border-t border-[#2A2A2A] pt-4">
          <div className="flex flex-col gap-1 text-xs text-[#666666]">
            <span>
              Created {format(new Date(post.created_at), "MMM d, yyyy 'at' h:mm a")}
            </span>
            <span>
              Updated {format(new Date(post.updated_at), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
