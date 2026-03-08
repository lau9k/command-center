"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import {
  Clock,
  FileText,
  BarChart3,
  Image as ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  StatusBadge,
  PlatformBadge,
  type PlatformType,
  type StatusType,
} from "@/components/ui/badge";
import type { ContentPost } from "@/lib/types/database";

type PostWithProject = ContentPost & {
  projects?: { id: string; name: string; color: string | null } | null;
};

interface BufferPostDetailProps {
  open: boolean;
  post: PostWithProject | null;
  onClose: () => void;
  onUpdate: (post: PostWithProject) => void;
}

export function BufferPostDetail({
  open,
  post,
  onClose,
  onUpdate,
}: BufferPostDetailProps) {
  const [updating, setUpdating] = React.useState(false);

  if (!post) return null;

  const caption = post.caption ?? post.body ?? "";
  const time = post.scheduled_at ?? post.scheduled_for;
  const platforms =
    post.platforms?.length > 0
      ? post.platforms
      : post.platform
        ? [post.platform]
        : [];
  const engagement = (post.engagement ?? {}) as Record<string, number>;
  const hasEngagement =
    post.status === "published" && Object.keys(engagement).length > 0;

  async function handleStatusChange(newStatus: string) {
    if (!post) return;
    setUpdating(true);

    try {
      const res = await fetch("/api/content-posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.id,
          status: newStatus,
          ...(newStatus === "scheduled" && !post.scheduled_at
            ? { scheduled_at: new Date().toISOString() }
            : {}),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        onUpdate({ ...post, ...updated });
      }
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Post Detail">
      <div className="space-y-5">
        {/* Title + project */}
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {post.title ?? "Untitled Post"}
          </h3>
          {post.projects && (
            <span className="text-xs text-muted-foreground">
              {post.projects.name}
            </span>
          )}
        </div>

        {/* Platform + status badges */}
        <div className="flex flex-wrap items-center gap-2">
          {platforms.map((p) => (
            <PlatformBadge key={p} platform={p as PlatformType} />
          ))}
          <StatusBadge status={post.status as StatusType} />
        </div>

        {/* Scheduled time */}
        {time && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            <span>
              {format(parseISO(time), "EEE, MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
        )}

        {/* Full caption */}
        {caption && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
              <FileText className="size-3" />
              Caption
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {caption}
            </p>
          </div>
        )}

        {/* Full-size image */}
        {post.image_url && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
              <ImageIcon className="size-3" />
              Media
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image_url}
                alt="Post media"
                className="w-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Engagement metrics */}
        {hasEngagement && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
              <BarChart3 className="size-3" />
              Engagement
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(engagement).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-border bg-[#0A0A0A] p-3 text-center"
                >
                  <div className="text-lg font-semibold text-foreground tabular-nums">
                    {typeof value === "number"
                      ? value.toLocaleString()
                      : String(value)}
                  </div>
                  <div className="text-[10px] font-medium uppercase text-muted-foreground">
                    {key.replace(/_/g, " ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Published timestamp */}
        {post.published_at && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4" />
            <span>
              Published{" "}
              {format(parseISO(post.published_at), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-border pt-4">
          <div className="flex gap-2">
            {post.status !== "scheduled" && (
              <Button
                size="sm"
                className="bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90"
                disabled={updating}
                onClick={() => handleStatusChange("scheduled")}
              >
                Schedule
              </Button>
            )}
            {post.status !== "draft" && (
              <Button
                variant="outline"
                size="sm"
                disabled={updating}
                onClick={() => handleStatusChange("draft")}
              >
                Move to Draft
              </Button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
