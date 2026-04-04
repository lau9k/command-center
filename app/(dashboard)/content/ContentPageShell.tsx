"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, ClipboardCheck, LayoutGrid, Plus, AlertCircle } from "lucide-react";
import Link from "next/link";
import { startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BufferCalendar } from "@/components/content/BufferCalendar";
import { ContentBoard } from "@/components/dashboard/ContentBoard";
import { ContentForm } from "@/components/dashboard/ContentForm";
import type { ContentFormData } from "@/components/dashboard/ContentForm";
import { EmptyState } from "@/components/ui/empty-state";
import { ContentStatusBadge } from "@/components/ui/status-badge";
import { SeedContentButton } from "@/components/content/SeedButton";
import type { ContentPost, Project } from "@/lib/types/database";
import type { ContentStatus } from "@/components/ui/status-badge";

type PostWithProject = ContentPost & {
  projects?: Pick<Project, "id" | "name" | "color"> | null;
};

type ViewMode = "calendar" | "board";

export function ContentPageShell() {
  const [view, setView] = useState<ViewMode>("calendar");
  const [formOpen, setFormOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: posts = [] } = useQuery<PostWithProject[]>({
    queryKey: ["content", "posts"],
    queryFn: async () => {
      const res = await fetch("/api/content");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json.data) ? json.data : [];
    },
  });

  const { data: calendarPosts = [] } = useQuery<PostWithProject[]>({
    queryKey: ["content", "calendar"],
    queryFn: async () => {
      const now = new Date();
      const params = new URLSearchParams({
        start: startOfMonth(now).toISOString(),
        end: endOfMonth(now).toISOString(),
      });
      const res = await fetch(`/api/content/calendar?${params}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: unscheduledPosts = [] } = useQuery<PostWithProject[]>({
    queryKey: ["content", "unscheduled"],
    queryFn: async () => {
      const res = await fetch("/api/content?unscheduled=true");
      if (!res.ok) return [];
      const json = await res.json();
      const all = Array.isArray(json.data) ? json.data : [];
      return all.filter(
        (p: PostWithProject) => !p.scheduled_at && !p.scheduled_for
      );
    },
  });

  const { data: projects = [] } = useQuery<Pick<Project, "id" | "name" | "color">[]>({
    queryKey: ["projects", "list"],
    queryFn: async () => {
      // Derive from posts as fallback — matches original behavior
      const projectMap = new Map<string, Pick<Project, "id" | "name" | "color">>();
      for (const post of posts) {
        if (post.projects) {
          projectMap.set(post.projects.id, post.projects);
        }
      }
      return Array.from(projectMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    },
  });

  const refreshPosts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["content"] });
    await queryClient.invalidateQueries({ queryKey: ["projects", "list"] });
  }, [queryClient]);

  const handleNewPost = useCallback(
    async (data: ContentFormData) => {
      try {
        const res = await fetch("/api/content-posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: data.title || null,
            body: data.body || null,
            platform: data.platform,
            status: data.status,
            scheduled_at: data.scheduled_at,
            image_url: data.image_url || null,
            type: "post",
            platforms: data.platform ? [data.platform] : [],
            metrics: {},
            engagement: {},
          }),
        });
        if (!res.ok) throw new Error("Failed to create post");
        toast.success("Post created");
        await refreshPosts();
      } catch {
        toast.error("Failed to save — try again");
      }
    },
    [refreshPosts]
  );

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Content Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule and manage posts across all projects
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/content/review">
              <ClipboardCheck className="size-4" />
              Review Drafts
            </Link>
          </Button>

          <Button asChild size="sm" className="gap-1.5">
            <Link href="/content/editor">
              <Plus className="size-4" />
              Create Post
            </Link>
          </Button>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-background p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("calendar")}
              className={cn(
                "gap-1.5 px-3",
                view === "calendar" && "bg-accent text-foreground"
              )}
            >
              <Calendar className="size-4" />
              Calendar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("board")}
              className={cn(
                "gap-1.5 px-3",
                view === "board" && "bg-accent text-foreground"
              )}
            >
              <LayoutGrid className="size-4" />
              Board
            </Button>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={<Calendar />}
            title="No content scheduled"
            description="Plan your next post across LinkedIn, Twitter, and Telegram."
            actionLabel="+ Create Post"
            actionHref="/content/editor"
          />
          <div className="flex justify-center">
            <SeedContentButton />
          </div>
        </div>
      ) : view === "calendar" ? (
        <div className="space-y-6">
          {unscheduledPosts.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="size-4" />
              <span>{unscheduledPosts.length} unscheduled</span>
            </div>
          )}
          <BufferCalendar initialPosts={calendarPosts} projects={projects} />
          {unscheduledPosts.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-medium text-foreground">
                Unscheduled Posts
              </h2>
              <div className="grid gap-2">
                {unscheduledPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="truncate text-sm font-medium text-foreground">
                        {post.title || "Untitled"}
                      </span>
                      {post.projects && (
                        <span
                          className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            backgroundColor: post.projects.color
                              ? `${post.projects.color}20`
                              : undefined,
                            color: post.projects.color ?? undefined,
                          }}
                        >
                          {post.projects.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {post.platform && (
                        <span className="text-xs text-muted-foreground capitalize">
                          {post.platform}
                        </span>
                      )}
                      <ContentStatusBadge
                        status={post.status as ContentStatus}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <ContentBoard
          initialPosts={posts}
          onPostsChange={refreshPosts}
        />
      )}

      {/* New Post Form */}
      <ContentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        post={null}
        onSubmit={handleNewPost}
      />
    </div>
  );
}
