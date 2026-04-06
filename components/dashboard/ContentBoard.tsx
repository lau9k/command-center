"use client";

import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Clock, FileText, Pencil, Trash2 } from "lucide-react";
import { StatusBadge, PlatformBadge, EmptyState, Drawer } from "@/components/ui";
import type { PlatformType, StatusType } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ContentForm } from "@/components/dashboard/ContentForm";
import { sanitizeText } from "@/lib/sanitize";
import type { ContentFormData } from "@/components/dashboard/ContentForm";
import { ConfirmDeleteModal } from "@/components/dashboard/ConfirmDeleteModal";
import { BulkActionBar } from "@/components/content/BulkActionBar";
import type { ContentPost, ContentPostStatus } from "@/lib/types/database";
const VALID_PLATFORMS = new Set<string>([
  "linkedin",
  "twitter",
  "youtube",
  "instagram",
  "tiktok",
]);

const COLUMNS: { id: ContentPostStatus; label: string; dotClass: string }[] = [
  { id: "draft", label: "Draft", dotClass: "bg-gray-500 dark:bg-gray-400" },
  { id: "ready", label: "Ready", dotClass: "bg-yellow-500 dark:bg-yellow-400" },
  { id: "scheduled", label: "Scheduled", dotClass: "bg-blue-500 dark:bg-blue-400" },
  { id: "published", label: "Published", dotClass: "bg-green-500 dark:bg-green-400" },
];

const STATUS_TRANSITIONS: Record<ContentPostStatus, ContentPostStatus | null> = {
  draft: "ready",
  ready: "scheduled",
  scheduled: "published",
  published: null,
  failed: "draft",
};

interface ContentBoardProps {
  initialPosts: ContentPost[];
  onPostsChange?: () => void;
}

export function ContentBoard({ initialPosts, onPostsChange }: ContentBoardProps) {
  const [posts, setPosts] = useState<ContentPost[]>(initialPosts);
  const [drawerPost, setDrawerPost] = useState<ContentPost | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Edit form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ContentPost | null>(null);
  const [deleting, setDeleting] = useState(false);

  const allSelected = useMemo(
    () => posts.length > 0 && posts.every((p) => selectedIds.has(p.id)),
    [posts, selectedIds]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map((p) => p.id)));
    }
  }, [allSelected, posts]);

  const columnPosts = (status: ContentPostStatus) =>
    posts.filter((p) => p.status === status);

  const refreshPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/content-posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
        onPostsChange?.();
      }
    } catch {
      // silent refresh failure
    }
  }, [onPostsChange]);

  const updatePostStatus = useCallback(
    async (id: string, status: ContentPostStatus) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status, updated_at: new Date().toISOString() }
            : p
        )
      );

      try {
        const res = await fetch("/api/content-posts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        if (!res.ok) {
          setPosts((prev) =>
            prev.map((p) => {
              const original = initialPosts.find((ip) => ip.id === p.id);
              return p.id === id && original ? original : p;
            })
          );
        }
      } catch {
        setPosts((prev) =>
          prev.map((p) => {
            const original = initialPosts.find((ip) => ip.id === p.id);
            return p.id === id && original ? original : p;
          })
        );
      }
    },
    [initialPosts]
  );

  const handleEditSubmit = useCallback(
    async (data: ContentFormData, postId?: string) => {
      try {
        if (postId) {
          const res = await fetch("/api/content-posts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: postId,
              title: data.title || null,
              body: data.body || null,
              platform: data.platform,
              status: data.status,
              scheduled_for: data.scheduled_for,
              image_url: data.image_url || null,
            }),
          });
          if (!res.ok) throw new Error("Failed to update post");
          toast.success("Post updated");
        } else {
          const res = await fetch("/api/content-posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: data.title || null,
              body: data.body || null,
              platform: data.platform,
              status: data.status,
              scheduled_for: data.scheduled_for,
              image_url: data.image_url || null,
              type: "post",
              platforms: data.platform ? [data.platform] : [],
              metrics: {},
              engagement: {},
            }),
          });
          if (!res.ok) throw new Error("Failed to create post");
          toast.success("Post created");
        }
        await refreshPosts();
        setDrawerPost(null);
      } catch {
        toast.error("Failed to save — try again");
      }
    },
    [refreshPosts]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/content-posts?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete post");
      toast.success("Post deleted");
      setDeleteTarget(null);
      setDrawerPost(null);
      await refreshPosts();
    } catch {
      toast.error("Failed to delete — try again");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refreshPosts]);

  function openEditForm(post: ContentPost) {
    setEditingPost(post);
    setFormOpen(true);
    setDrawerPost(null);
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        title="No content posts yet"
        description="Create your first content post to start managing your content pipeline."
      />
    );
  }

  const nextStatus = drawerPost ? STATUS_TRANSITIONS[drawerPost.status] : null;
  const drawerPlatform = drawerPost?.platform;
  const isDrawerPlatformValid =
    drawerPlatform && VALID_PLATFORMS.has(drawerPlatform);
  const drawerMetrics = drawerPost?.metrics as Record<string, number> | null;
  const hasDrawerMetrics =
    drawerPost?.status === "published" &&
    drawerMetrics &&
    Object.keys(drawerMetrics).length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Select All header */}
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all posts"
        />
        <span className="text-sm text-muted-foreground">
          {selectedIds.size > 0
            ? `${selectedIds.size} of ${posts.length} selected`
            : "Select all"}
        </span>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {COLUMNS.map((column) => {
          const items = columnPosts(column.id);

          return (
            <div key={column.id} className="flex flex-col">
              {/* Column header */}
              <div className="mb-3 flex items-center gap-2">
                <div
                  className={`size-2.5 rounded-full ${column.dotClass}`}
                />
                <h3 className="text-sm font-semibold text-foreground">
                  {column.label}
                </h3>
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                  {items.length}
                </span>
              </div>

              {/* Column body */}
              <div className="flex min-h-[200px] flex-col gap-2 rounded-lg border border-border bg-background p-2">
                {items.map((post) => {
                  const platform = post.platform;
                  const isValidPlatform =
                    platform && VALID_PLATFORMS.has(platform);
                  const scheduledDate =
                    post.scheduled_for;
                  const isSelected = selectedIds.has(post.id);

                  return (
                    <div
                      key={post.id}
                      className={`group rounded-lg border bg-card p-3 transition-all duration-150 hover:border-ring hover:shadow-sm ${isSelected ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(post.id)}
                          className="mt-0.5"
                          aria-label={`Select ${post.title ?? "post"}`}
                        />
                      <button
                        type="button"
                        onClick={() => setDrawerPost(post)}
                        className="flex-1 min-w-0 text-left"
                      >
                        {/* Title */}
                        <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                          {post.title ?? post.body ?? "Untitled post"}
                        </p>

                        {/* Platform + Status badges */}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {isValidPlatform && (
                            <PlatformBadge
                              platform={platform as PlatformType}
                            />
                          )}
                          <StatusBadge status={post.status as StatusType} />
                        </div>

                        {/* Scheduled date */}
                        {scheduledDate && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {format(
                              new Date(scheduledDate),
                              "MMM d, h:mm a"
                            )}
                          </div>
                        )}
                      </button>
                      </div>

                      {/* Action icons */}
                      <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(post);
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Edit post"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(post);
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Delete post"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <div className="flex flex-1 items-center justify-center py-8">
                    <p className="text-xs text-muted-foreground">
                      No posts
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Post detail drawer */}
      <Drawer
        open={!!drawerPost}
        onClose={() => setDrawerPost(null)}
        title={drawerPost?.title ?? "Post Details"}
        footer={
          <div className="flex w-full gap-2">
            {drawerPost && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => openEditForm(drawerPost)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(drawerPost)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </>
            )}
            {nextStatus && (
              <Button
                onClick={() => {
                  if (drawerPost) {
                    updatePostStatus(drawerPost.id, nextStatus);
                    setDrawerPost(null);
                  }
                }}
                className="ml-auto"
              >
                Move to{" "}
                {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
              </Button>
            )}
          </div>
        }
      >
        {drawerPost ? (
          <div className="flex flex-col gap-5">
            {/* Status + Platform */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={drawerPost.status as StatusType} />
              {isDrawerPlatformValid && (
                <PlatformBadge platform={drawerPlatform as PlatformType} />
              )}
              {drawerPost.type && (
                <span className="text-xs text-muted-foreground">
                  {drawerPost.type}
                </span>
              )}
            </div>

            {/* Body */}
            {(drawerPost.body ?? drawerPost.caption) && (
              <div>
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Caption
                </h4>
                <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                  {sanitizeText(drawerPost.body ?? drawerPost.caption ?? "")}
                </p>
              </div>
            )}

            {/* Media */}
            {drawerPost.media_urls && drawerPost.media_urls.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Media
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {drawerPost.media_urls.map((url, i) => (
                    <div
                      key={i}
                      className="flex h-28 items-center justify-center overflow-hidden rounded-md bg-accent"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={drawerPost.title || "Content image"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scheduled time */}
            {(drawerPost.scheduled_for) && (
              <div>
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Scheduled For
                </h4>
                <div className="flex items-center gap-1.5 text-sm text-foreground">
                  <Clock className="size-4 text-muted-foreground" />
                  {format(
                    new Date(
                      (drawerPost.scheduled_for)!
                    ),
                    "EEEE, MMM d, yyyy 'at' h:mm a"
                  )}
                </div>
              </div>
            )}

            {/* Published metrics */}
            {hasDrawerMetrics && (
              <div>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Performance
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {drawerMetrics.impressions !== undefined && (
                    <div className="rounded-lg bg-accent p-3 text-center">
                      <p className="text-lg font-semibold text-foreground">
                        {drawerMetrics.impressions.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Impressions
                      </p>
                    </div>
                  )}
                  {drawerMetrics.likes !== undefined && (
                    <div className="rounded-lg bg-accent p-3 text-center">
                      <p className="text-lg font-semibold text-foreground">
                        {drawerMetrics.likes.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Likes</p>
                    </div>
                  )}
                  {drawerMetrics.comments !== undefined && (
                    <div className="rounded-lg bg-accent p-3 text-center">
                      <p className="text-lg font-semibold text-foreground">
                        {drawerMetrics.comments.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Comments
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="border-t border-border pt-4">
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>
                  Created{" "}
                  {format(
                    new Date(drawerPost.created_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </span>
                <span>
                  Updated{" "}
                  {format(
                    new Date(drawerPost.updated_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div />
        )}
      </Drawer>

      {/* Content Form Drawer */}
      <ContentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        post={editingPost}
        onSubmit={handleEditSubmit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Post"
        description={`Are you sure you want to delete "${deleteTarget?.title ?? "this post"}"? This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        posts={posts}
        totalCount={posts.length}
        onClear={() => setSelectedIds(new Set())}
        onBulkUpdate={refreshPosts}
      />
    </div>
  );
}
