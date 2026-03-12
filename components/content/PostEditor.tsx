"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Eye, Pencil, Loader2 } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlatformPreview, PlatformCharacterCount } from "@/components/content/PlatformPreview";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/types/database";
import type { ContentPost, ContentPostStatus } from "@/lib/types/database";

const ALL_PLATFORMS = ["twitter", "linkedin", "instagram", "tiktok", "telegram", "youtube"];
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
            className="bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90"
            onClick={() => handleSave(scheduledDate ? "scheduled" : "ready")}
            disabled={saving || (!body.trim() && !title.trim())}
          >
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {scheduledDate ? "Schedule" : "Mark Ready"}
          </Button>
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
                    const color = PLATFORM_COLORS[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          selected
                            ? "border-transparent text-white"
                            : "border-border text-muted-foreground hover:border-ring"
                        )}
                        style={selected ? { backgroundColor: color } : undefined}
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: selected ? "white" : color }}
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
    </div>
  );
}
