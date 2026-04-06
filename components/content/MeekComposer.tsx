"use client";

import * as React from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContentPost, BufferPostStatus } from "@/lib/types/database";
import { PLATFORM_LABELS } from "@/lib/types/database";

const PLATFORM_BG_CLASSES: Record<string, string> = {
  twitter: "bg-sky-500 dark:bg-sky-400",
  linkedin: "bg-blue-700 dark:bg-blue-500",
  instagram: "bg-pink-500 dark:bg-pink-400",
  tiktok: "bg-cyan-400 dark:bg-cyan-300",
  telegram: "bg-sky-600 dark:bg-sky-500",
  youtube: "bg-red-600 dark:bg-red-500",
  reddit: "bg-orange-600 dark:bg-orange-500",
  bluesky: "bg-blue-500 dark:bg-blue-400",
  facebook: "bg-blue-600 dark:bg-blue-500",
};

const ALL_PLATFORMS = ["twitter", "instagram", "tiktok", "telegram", "linkedin", "youtube"];
const ALL_STATUSES: BufferPostStatus[] = ["draft", "scheduled", "published", "failed"];

interface MeekComposerProps {
  open: boolean;
  onClose: () => void;
  post: ContentPost | null;
  defaultDate: Date | null;
  projectId: string;
  onSave: (post: ContentPost) => void;
  onDelete: (id: string) => void;
}

export function MeekComposer({
  open,
  onClose,
  post,
  defaultDate,
  projectId,
  onSave,
  onDelete,
}: MeekComposerProps) {
  const [caption, setCaption] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = React.useState("");
  const [scheduledTime, setScheduledTime] = React.useState("12:00");
  const [status, setStatus] = React.useState<BufferPostStatus>("draft");
  const [saving, setSaving] = React.useState(false);

  const isEditing = !!post;

  // Reset form when post or open changes
  React.useEffect(() => {
    if (!open) return;

    if (post) {
      setCaption(post.caption ?? post.body ?? "");
      setTitle(post.title ?? "");
      setImageUrl(post.image_url ?? post.media_urls?.[0] ?? "");
      setSelectedPlatforms(
        post.platforms?.length ? post.platforms : post.platform ? [post.platform] : []
      );
      const dt = post.scheduled_for;
      if (dt) {
        const d = new Date(dt);
        setScheduledDate(format(d, "yyyy-MM-dd"));
        setScheduledTime(format(d, "HH:mm"));
      } else {
        setScheduledDate("");
        setScheduledTime("12:00");
      }
      setStatus(post.status as BufferPostStatus);
    } else {
      setCaption("");
      setTitle("");
      setImageUrl("");
      setSelectedPlatforms([]);
      setStatus("draft");
      if (defaultDate) {
        setScheduledDate(format(defaultDate, "yyyy-MM-dd"));
        setScheduledTime(format(defaultDate, "HH:mm"));
      } else {
        setScheduledDate("");
        setScheduledTime("12:00");
      }
    }
  }, [open, post, defaultDate]);

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleSave(asStatus: BufferPostStatus) {
    if (!caption.trim()) return;
    setSaving(true);

    const scheduledAt =
      scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

    const payload: Record<string, unknown> = {
      caption: caption.trim(),
      title: title.trim() || null,
      image_url: imageUrl.trim() || null,
      platforms: selectedPlatforms,
      scheduled_for: scheduledAt,
      status: asStatus,
      project_id: projectId,
    };

    if (isEditing) {
      payload.id = post.id;
    }

    try {
      const res = await fetch("/api/content-posts", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        onSave(saved);
      }
    } finally {
      setSaving(false);
    }
  }

  const charCount = caption.length;
  const maxChars = 280; // Twitter limit reference

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Post" : "New Post"}
      footer={
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleSave("draft")}
            disabled={saving || !caption.trim()}
          >
            Save Draft
          </Button>
          <Button
            className="flex-1 bg-blue-500 dark:bg-blue-400 text-white hover:bg-blue-500/90 dark:hover:bg-blue-400/90"
            onClick={() => handleSave("scheduled")}
            disabled={saving || !caption.trim() || !scheduledDate}
          >
            Schedule
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Title */}
        <div>
          <Label htmlFor="post-title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Title (optional)
          </Label>
          <Input
            id="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title..."
            className="mt-1"
          />
        </div>

        {/* Caption */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="post-caption" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Caption
            </Label>
            <span
              className={cn(
                "text-xs tabular-nums",
                charCount > maxChars ? "text-red-500 dark:text-red-400" : "text-muted-foreground"
              )}
            >
              {charCount}/{maxChars}
            </span>
          </div>
          <textarea
            id="post-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write your post caption..."
            rows={4}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Image URL */}
        <div>
          <Label htmlFor="post-image" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Image URL
          </Label>
          <Input
            id="post-image"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1"
          />
          {imageUrl && (
            <div className="mt-2 h-32 w-full overflow-hidden rounded-lg bg-accent">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
            </div>
          )}
        </div>

        {/* Platform multi-select */}
        <div>
          <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Platforms
          </Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_PLATFORMS.map((p) => {
              const selected = selectedPlatforms.includes(p);
              const bgClass = PLATFORM_BG_CLASSES[p] ?? "bg-gray-500 dark:bg-gray-400";
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? cn("border-transparent text-white", bgClass)
                      : "border-border text-muted-foreground hover:border-ring"
                  )}
                >
                  <span
                    className={cn("size-2 rounded-full", selected ? "bg-white" : bgClass)}
                  />
                  {PLATFORM_LABELS[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date / Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="post-date" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Date
            </Label>
            <Input
              id="post-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="post-time" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Time
            </Label>
            <Input
              id="post-time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Status (for editing) */}
        {isEditing && (
          <div>
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    status === s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-ring"
                  )}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Delete */}
        {isEditing && (
          <div className="border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 dark:text-red-400 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400"
              onClick={() => onDelete(post.id)}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Delete Post
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
