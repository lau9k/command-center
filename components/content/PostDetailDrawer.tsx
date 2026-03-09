"use client";

import { format } from "date-fns";
import { Clock, Eye, Heart, MessageCircle, Image } from "lucide-react";
import { Drawer } from "@/components/ui";
import { StatusBadge, PlatformBadge } from "@/components/ui";
import type { PlatformType, StatusType } from "@/components/ui";
import { Button } from "@/components/ui/button";
import type { ContentPost, ContentPostStatus } from "@/lib/types/database";
import { sanitizeText } from "@/lib/sanitize";

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
  failed: "draft",
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
            <span className="text-xs text-muted-foreground">
              {post.type}
            </span>
          )}
        </div>

        {/* Body */}
        {post.body && (
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
              Caption
            </h4>
            <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {sanitizeText(post.body)}
            </p>
          </div>
        )}

        {/* Hero image */}
        {post.image_url && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Image
            </h4>
            <div className="overflow-hidden rounded-lg bg-accent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image_url}
                alt={post.title ?? ""}
                className="w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Media
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {post.media_urls.map((url, i) => (
                <div
                  key={i}
                  className="flex h-28 items-center justify-center overflow-hidden rounded-md bg-accent"
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

        {!post.image_url && (!post.media_urls || post.media_urls.length === 0) && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Image className="size-4" />
            No media attached
          </div>
        )}

        {/* Scheduled time */}
        {post.scheduled_for && (
          <div>
            <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
              Scheduled For
            </h4>
            <div className="flex items-center gap-1.5 text-sm text-foreground">
              <Clock className="size-4 text-muted-foreground" />
              {format(new Date(post.scheduled_for), "EEEE, MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        )}

        {/* Metrics (published) */}
        {hasMetrics && (
          <div>
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
              Performance
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {metrics.impressions !== undefined && (
                <div className="rounded-lg bg-accent p-3 text-center">
                  <Eye className="mx-auto mb-1 size-4 text-muted-foreground" />
                  <p className="text-lg font-semibold text-foreground">
                    {metrics.impressions.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">Impressions</p>
                </div>
              )}
              {metrics.likes !== undefined && (
                <div className="rounded-lg bg-accent p-3 text-center">
                  <Heart className="mx-auto mb-1 size-4 text-muted-foreground" />
                  <p className="text-lg font-semibold text-foreground">
                    {metrics.likes.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">Likes</p>
                </div>
              )}
              {metrics.comments !== undefined && (
                <div className="rounded-lg bg-accent p-3 text-center">
                  <MessageCircle className="mx-auto mb-1 size-4 text-muted-foreground" />
                  <p className="text-lg font-semibold text-foreground">
                    {metrics.comments.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-muted">Comments</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="border-t border-border pt-4">
          <div className="flex flex-col gap-1 text-xs text-text-muted">
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
