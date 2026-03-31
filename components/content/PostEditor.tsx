"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Eye, Pencil, Loader2, Send } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlatformPreview, PlatformCharacterCount } from "@/components/content/PlatformPreview";
import { PLATFORM_LABELS } from "@/lib/types/database";
import type { ContentPost, ContentPostStatus } from "@/lib/types/database";

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

const ALL_PLATFORMS = ["twitter", "linkedin", "instagram", "tiktok", "telegram", "youtube"];
const PUBLISH_PLATFORMS = ["twitter", "linkedin", "facebook", "reddit", "bluesky"];
const ALL_STATUSES: ContentPostStatus[] = ["draft", "ready", "scheduled", "published"];

const PREVIEW_PLATFORMS = ["twitter", "linkedin"] as const;

interface PostEditorProps {
  post?: ContentPost | null;
}

export function PostEditor({ post }: PostEditorProps) {
  const router = useRouter();
  const isEditing = !!post;

  const [title, setTitle] = React.useState(post?.title ?? "");
  const [body, setBody] = React.useState(post?.caption ?? post?.body ?? "");
  const [imageUrl, setImageUrl] = React.useState(post?.image_url ?? "");
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<string[]>(
    post?.platforms?.length ? post.platforms : post?.platform ? [post.platform] : []
  );
  const [scheduledDate, setScheduledDate] = React.useState(() => {
    const dt = post?.scheduled_at ?? post?.scheduled_for;
    return dt ? format(new Date(dt), "yyyy-MM-dd") : "";
  });
  const [scheduledTime, setScheduledTime] = React.useState(() => {
    const dt = post?.scheduled_at ?? post?.scheduled_for;
    return dt ? format(new Date(dt), "HH:mm") : "12:00";
  });
  const [status, setStatus] = React.useState<ContentPostStatus>(
    (post?.status as ContentPostStatus) ?? "draft"
  );
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("edit");
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);
  const [publishPlatforms, setPublishPlatforms] = React.useState<string[]>([]);
  const [publishing, setPublishing] = React.useState(false);

  const isPublished = status === "published";

  function togglePublishPlatform(platform: string) {
    setPublishPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  async function handlePublish() {
    if (!post?.id || publishPlatforms.length === 0) return;

    setPublishing(true);
    try {
      const res = await fetch("/api/content/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_post_id: post.id,
          platforms: publishPlatforms,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to publish");
      }

      toast.success(`Published to ${publishPlatforms.length} platform${publishPlatforms.length > 1 ? "s" : ""}`);
      setPublishDialogOpen(false);
      setPublishPlatforms([]);
      setStatus("published");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function handleSave(saveStatus: ContentPostStatus) {
    if (!body.trim() && !title.trim()) {
      toast.error("Post needs a title or body");
      return;
    }

    setSaving(true);

    const scheduledAt =
      scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

    const payload: Record<string, unknown> = {
      title: title.trim() || "Untitled Post",
      body: body.trim() || null,
      caption: body.trim() || null,
      image_url: imageUrl.trim() || null,
      platforms: selectedPlatforms,
      platform: selectedPlatforms[0] ?? null,
      scheduled_at: scheduledAt,
      status: saveStatus,
    };

    if (isEditing && post) {
      payload.id = post.id;
    }

    try {
      const res = await fetch("/api/content-posts/editor", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save post");
      }

      toast.success(isEditing ? "Post updated" : "Post created");
      router.push("/content");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSaving(false);
    }
  }

  // Determine which platform to preview
  const previewPlatform: "twitter" | "linkedin" = selectedPlatforms.includes("linkedin")
    ? "linkedin"
    : "twitter";

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/content">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {isEditing ? "Edit Post" : "Create Post"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Compose and schedule content across platforms
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave("draft")}
            disabled={saving}
          >
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Save Draft
          </Button>
          <Button
            size="sm"
            className="bg-blue-500 dark:bg-blue-400 text-white hover:bg-blue-500/90 dark:hover:bg-blue-400/90"
            onClick={() => handleSave(scheduledDate ? "scheduled" : "ready")}
            disabled={saving || (!body.trim() && !title.trim())}
          >
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {scheduledDate ? "Schedule" : "Mark Ready"}
          </Button>
          {isEditing && (
            <Button
              size="sm"
              variant={isPublished ? "outline" : "default"}
              className={isPublished ? "" : "bg-emerald-600 text-white hover:bg-emerald-600/90"}
              onClick={() => {
                setPublishPlatforms(
                  selectedPlatforms.filter((p) => PUBLISH_PLATFORMS.includes(p))
                );
                setPublishDialogOpen(true);
              }}
              disabled={saving || (!body.trim() && !title.trim())}
            >
              <Send className="mr-1.5 size-3.5" />
              {isPublished ? "Republish" : "Publish"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs: Edit / Preview */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="edit" className="gap-1.5">
            <Pencil className="size-3.5" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="size-3.5" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main editor area */}
            <div className="space-y-5 lg:col-span-2">
              {/* Title */}
              <div>
                <Label htmlFor="editor-title" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Title
                </Label>
                <Input
                  id="editor-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Post title..."
                  className="mt-1.5"
                />
              </div>

              {/* Body / Caption */}
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="editor-body" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Content
                  </Label>
                  <div className="flex items-center gap-3">
                    {selectedPlatforms.map((p) => (
                      <PlatformCharacterCount key={p} length={body.length} platform={p} />
                    ))}
                    {selectedPlatforms.length === 0 && (
                      <PlatformCharacterCount length={body.length} platform="twitter" />
                    )}
                  </div>
                </div>
                <Textarea
                  id="editor-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your post content...&#10;&#10;Supports markdown for LinkedIn posts."
                  rows={10}
                  className="mt-1.5 resize-none"
                />
              </div>

              {/* Image URL */}
              <div>
                <Label htmlFor="editor-image" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Image URL
                </Label>
                <Input
                  id="editor-image"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1.5"
                />
                {imageUrl && (
                  <div className="mt-2 h-40 w-full overflow-hidden rounded-lg border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Platforms */}
              <div className="rounded-lg border border-border p-4">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Platforms
                </Label>
                <div className="mt-3 flex flex-wrap gap-2">
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

              {/* Schedule */}
              <div className="rounded-lg border border-border p-4">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Schedule
                </Label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="editor-date" className="text-[11px] text-muted-foreground">
                      Date
                    </Label>
                    <Input
                      id="editor-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editor-time" className="text-[11px] text-muted-foreground">
                      Time
                    </Label>
                    <Input
                      id="editor-time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              {isEditing && (
                <div className="rounded-lg border border-border p-4">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Status
                  </Label>
                  <div className="mt-3 flex flex-wrap gap-2">
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

              {/* Inline preview for selected platform */}
              {body.trim() && (
                <div className="rounded-lg border border-border p-4">
                  <PlatformPreview
                    platform={previewPlatform}
                    body={body}
                    imageUrl={imageUrl || undefined}
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div className="space-y-8">
            {(selectedPlatforms.length > 0
              ? selectedPlatforms.filter((p): p is "twitter" | "linkedin" =>
                  PREVIEW_PLATFORMS.includes(p as "twitter" | "linkedin")
                )
              : (["twitter"] as const)
            ).map((p) => (
              <div key={p} className="mx-auto max-w-lg">
                <PlatformPreview
                  platform={p}
                  body={body}
                  imageUrl={imageUrl || undefined}
                />
              </div>
            ))}
            {selectedPlatforms.some((p) => !PREVIEW_PLATFORMS.includes(p as "twitter" | "linkedin")) && (
              <p className="text-center text-sm text-muted-foreground">
                Preview available for Twitter/X and LinkedIn. Other platforms will use a similar layout.
              </p>
            )}
            {selectedPlatforms.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Select platforms to see platform-specific previews.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Publish Platform Selector Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isPublished ? "Republish Post" : "Publish Post"}</DialogTitle>
            <DialogDescription>
              Select which platforms to publish to via Zernio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {PUBLISH_PLATFORMS.map((platform) => {
              const checked = publishPlatforms.includes(platform);
              return (
                <label
                  key={platform}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => togglePublishPlatform(platform)}
                  />
                  <span
                    className={cn("size-2.5 rounded-full", PLATFORM_BG_CLASSES[platform] ?? "bg-gray-500 dark:bg-gray-400")}
                  />
                  <span className="text-sm font-medium">
                    {PLATFORM_LABELS[platform] ?? platform}
                  </span>
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPublishDialogOpen(false)}
              disabled={publishing}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-600/90"
              onClick={handlePublish}
              disabled={publishing || publishPlatforms.length === 0}
            >
              {publishing && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {publishing
                ? "Publishing..."
                : `Publish to ${publishPlatforms.length} platform${publishPlatforms.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
