"use client";

import { useState } from "react";
import { Calendar, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BufferCalendar } from "@/components/content/BufferCalendar";
import { ContentBoard } from "@/components/dashboard/ContentBoard";
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

      {view === "calendar" ? (
        <BufferCalendar initialPosts={calendarPosts} projects={projects} />
      ) : (
        <ContentBoard initialPosts={allPosts} />
      )}
    </div>
  );
}
