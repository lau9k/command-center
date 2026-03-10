"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Calendar, LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BufferCalendar } from "@/components/content/BufferCalendar";
import { ContentBoard } from "@/components/dashboard/ContentBoard";
import { ContentForm } from "@/components/dashboard/ContentForm";
import type { ContentFormData } from "@/components/dashboard/ContentForm";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";
import { SeedContentButton } from "@/components/content/SeedButton";
import type { ContentPost, Project } from "@/lib/types/database";

type PostWithProject = ContentPost & {
  projects?: { id: string; name: string; color: string | null } | null;
};

type ViewMode = "calendar" | "board";

interface ContentPageShellProps {
  calendarPosts: PostWithProject[];
  allPosts: ContentPost[];
  projects: Pick<Project, "id" | "name" | "color">[];
}

export function ContentPageShell({
  calendarPosts,
  allPosts,
  projects,
}: ContentPageShellProps) {
  const [view, setView] = useState<ViewMode>("calendar");
  const [posts, setPosts] = useState<ContentPost[]>(allPosts);
  const [formOpen, setFormOpen] = useState(false);

  const refreshPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/content-posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    }
  }, []);

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
          <Button
            onClick={() => setFormOpen(true)}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="size-4" />
            New Post
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

      {posts.length === 0 && allPosts.length === 0 ? (
        <div className="space-y-4">
          <ModuleEmptyState module="content" />
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
