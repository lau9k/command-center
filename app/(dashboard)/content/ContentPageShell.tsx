"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Calendar, ClipboardCheck, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BufferCalendar } from "@/components/content/BufferCalendar";
import { ContentBoard } from "@/components/dashboard/ContentBoard";
import { ContentForm } from "@/components/dashboard/ContentForm";
import type { ContentFormData } from "@/components/dashboard/ContentForm";
import { EmptyState } from "@/components/ui/empty-state";
import { SeedContentButton } from "@/components/content/SeedButton";
import type { ContentPost, Project } from "@/lib/types/database";

type PostWithProject = ContentPost & {
  projects?: { id: string; name: string; color: string | null } | null;
};

type ViewMode = "calendar" | "board";

export function ContentPageShell() {
  const [view, setView] = useState<ViewMode>("calendar");
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [calendarPosts, setCalendarPosts] = useState<PostWithProject[]>([]);
  const [projects, setProjects] = useState<
    Pick<Project, "id" | "name" | "color">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const fetchAllPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/content");
      if (res.ok) {
        const json = await res.json();
        const data: PostWithProject[] = Array.isArray(json.data)
          ? json.data
          : [];
        setPosts(data);

        // Extract unique projects from joined data
        const projectMap = new Map<
          string,
          Pick<Project, "id" | "name" | "color">
        >();
        for (const post of data) {
          if (post.projects) {
            projectMap.set(post.projects.id, post.projects);
          }
        }
        setProjects(
          Array.from(projectMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
      }
    } catch {
      // silent
    }
  }, []);

  const fetchCalendarPosts = useCallback(async () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const params = new URLSearchParams({
      start: monthStart.toISOString(),
      end: monthEnd.toISOString(),
    });
    try {
      const res = await fetch(`/api/content/calendar?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCalendarPosts(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchAllPosts(), fetchCalendarPosts()]);
      setLoading(false);
    }
    init();
  }, [fetchAllPosts, fetchCalendarPosts]);

  const refreshPosts = useCallback(async () => {
    await Promise.all([fetchAllPosts(), fetchCalendarPosts()]);
  }, [fetchAllPosts, fetchCalendarPosts]);

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

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            Content Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule and manage posts across all projects
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      </div>
    );
  }

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
        <BufferCalendar initialPosts={calendarPosts} projects={projects} />
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
