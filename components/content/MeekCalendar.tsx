"use client";

import * as React from "react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  eachDayOfInterval,
  format,
  isToday,
  parseISO,
  setHours,
  setMinutes,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ContentPost } from "@/lib/types/database";
import { MeekPostCard } from "./MeekPostCard";
import { MeekComposer } from "./MeekComposer";

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

type ViewMode = "week" | "month";

interface MeekCalendarProps {
  initialPosts: ContentPost[];
  projectId: string;
}

export function MeekCalendar({ initialPosts, projectId }: MeekCalendarProps) {
  const [posts, setPosts] = React.useState<ContentPost[]>(initialPosts);
  const [viewMode, setViewMode] = React.useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [editingPost, setEditingPost] = React.useState<ContentPost | null>(null);
  const [composerDate, setComposerDate] = React.useState<Date | null>(null);

  const rangeStart =
    viewMode === "week"
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : startOfMonth(currentDate);
  const rangeEnd =
    viewMode === "week"
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : endOfMonth(currentDate);

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  // For month view, pad to full weeks
  const monthWeekStart = startOfWeek(rangeStart, { weekStartsOn: 1 });
  const monthWeekEnd = endOfWeek(rangeEnd, { weekStartsOn: 1 });
  const monthDays =
    viewMode === "month"
      ? eachDayOfInterval({ start: monthWeekStart, end: monthWeekEnd })
      : days;
  const displayDays = viewMode === "month" ? monthDays : days;

  // Group posts by date
  const postsByDate = React.useMemo(() => {
    const map = new Map<string, ContentPost[]>();
    for (const post of posts) {
      const dateStr = post.scheduled_at ?? post.scheduled_for;
      if (!dateStr) continue;
      const dateKey = format(parseISO(dateStr), "yyyy-MM-dd");
      const existing = map.get(dateKey) ?? [];
      existing.push(post);
      map.set(dateKey, existing);
    }
    return map;
  }, [posts]);

  function navigate(direction: "prev" | "next") {
    if (viewMode === "week") {
      setCurrentDate((d) => (direction === "prev" ? subWeeks(d, 1) : addWeeks(d, 1)));
    } else {
      setCurrentDate((d) => (direction === "prev" ? subMonths(d, 1) : addMonths(d, 1)));
    }
  }

  function openComposerForDate(day: Date) {
    setEditingPost(null);
    setComposerDate(setMinutes(setHours(day, 12), 0));
    setComposerOpen(true);
  }

  function openComposerForPost(post: ContentPost) {
    setEditingPost(post);
    setComposerDate(null);
    setComposerOpen(true);
  }

  function openNewComposer() {
    setEditingPost(null);
    setComposerDate(setMinutes(setHours(new Date(), 12), 0));
    setComposerOpen(true);
  }

  function closeComposer() {
    setComposerOpen(false);
    setEditingPost(null);
    setComposerDate(null);
  }

  async function handleSave(post: ContentPost) {
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === post.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = post;
        return next;
      }
      return [post, ...prev];
    });
    closeComposer();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/content-posts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      closeComposer();
    }
  }

  const headerLabel =
    viewMode === "week"
      ? `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`
      : format(currentDate, "MMMM yyyy");

  // Stats
  const draftCount = posts.filter((p) => p.status === "draft").length;
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
  const publishedCount = posts.filter((p) => p.status === "published").length;

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 rounded-lg bg-gray-500/10 dark:bg-gray-400/10 px-3 py-1.5 text-sm">
          <span className="font-semibold text-muted-foreground">{draftCount}</span>
          <span className="text-xs text-muted-foreground">Drafts</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-400/10 px-3 py-1.5 text-sm">
          <span className="font-semibold text-blue-500 dark:text-blue-400">{scheduledCount}</span>
          <span className="text-xs text-blue-500 dark:text-blue-400">Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-green-500/10 dark:bg-green-400/10 px-3 py-1.5 text-sm">
          <span className="font-semibold text-green-500 dark:text-green-400">{publishedCount}</span>
          <span className="text-xs text-green-500 dark:text-green-400">Published</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex rounded-lg border border-border bg-card">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors rounded-l-lg",
                viewMode === "week"
                  ? "bg-blue-500 dark:bg-blue-400 text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors rounded-r-lg",
                viewMode === "month"
                  ? "bg-blue-500 dark:bg-blue-400 text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Month
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("prev")}
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("next")}
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <span className="text-sm font-medium text-foreground">{headerLabel}</span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Today
          </Button>
        </div>

        <Button
          size="sm"
          className="bg-blue-500 dark:bg-blue-400 text-white hover:bg-blue-500/90 dark:hover:bg-blue-400/90"
          onClick={openNewComposer}
        >
          <Plus className="mr-1 size-4" />
          New Post
        </Button>
      </div>

      {/* Calendar Grid */}
      {viewMode === "week" ? (
        <WeekView
          days={displayDays}
          postsByDate={postsByDate}
          onPostClick={openComposerForPost}
          onEmptySlotClick={openComposerForDate}
        />
      ) : (
        <MonthView
          days={displayDays}
          postsByDate={postsByDate}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPostClick={openComposerForPost}
          onEmptySlotClick={openComposerForDate}
        />
      )}

      {/* Composer Slide-over */}
      <MeekComposer
        open={composerOpen}
        onClose={closeComposer}
        post={editingPost}
        defaultDate={composerDate}
        projectId={projectId}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}

// --- Week View ---

function WeekView({
  days,
  postsByDate,
  onPostClick,
  onEmptySlotClick,
}: {
  days: Date[];
  postsByDate: Map<string, ContentPost[]>;
  onPostClick: (post: ContentPost) => void;
  onEmptySlotClick: (day: Date) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-px rounded-xl border border-border bg-border overflow-hidden sm:grid-cols-7">
      {days.map((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const dayPosts = postsByDate.get(dateKey) ?? [];
        const today = isToday(day);

        return (
          <div
            key={dateKey}
            className={cn(
              "flex min-h-[200px] flex-col bg-card p-2",
              today && "bg-accent"
            )}
          >
            {/* Day header */}
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  today ? "bg-blue-500 dark:bg-blue-400 text-white" : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>
            </div>

            {/* Post cards */}
            <div className="flex flex-col gap-2 flex-1">
              {dayPosts.map((post) => (
                <MeekPostCard
                  key={post.id}
                  post={post}
                  onClick={() => onPostClick(post)}
                />
              ))}

              {/* Empty slot - click to add */}
              <button
                type="button"
                onClick={() => onEmptySlotClick(day)}
                className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground opacity-0 transition-opacity hover:border-ring hover:text-foreground group-hover:opacity-100"
                style={{ opacity: dayPosts.length === 0 ? 1 : undefined }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={(e) => {
                  if (dayPosts.length > 0) e.currentTarget.style.opacity = "0";
                }}
              >
                <Plus className="size-3" />
                Add
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Month View ---

function MonthView({
  days,
  postsByDate,
  rangeStart,
  rangeEnd,
  onPostClick,
  onEmptySlotClick,
}: {
  days: Date[];
  postsByDate: Map<string, ContentPost[]>;
  rangeStart: Date;
  rangeEnd: Date;
  onPostClick: (post: ContentPost) => void;
  onEmptySlotClick: (day: Date) => void;
}) {
  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-px mb-px">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="px-2 py-1.5 text-center text-xs font-medium uppercase text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px rounded-xl border border-border bg-border overflow-hidden">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDate.get(dateKey) ?? [];
          const today = isToday(day);
          const inRange = day >= rangeStart && day <= rangeEnd;

          return (
            <button
              type="button"
              key={dateKey}
              onClick={() => {
                if (dayPosts.length > 0) {
                  onPostClick(dayPosts[0]);
                } else {
                  onEmptySlotClick(day);
                }
              }}
              className={cn(
                "flex min-h-[80px] flex-col bg-card p-2 text-left transition-colors hover:bg-accent/50",
                today && "bg-accent",
                !inRange && "opacity-40"
              )}
            >
              <span
                className={cn(
                  "mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  today ? "bg-blue-500 dark:bg-blue-400 text-white" : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Post count indicator */}
              {dayPosts.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-auto">
                  {dayPosts.slice(0, 4).map((post) => {
                    const platforms = post.platforms ?? [];
                    const primaryPlatform = platforms[0] ?? post.platform;
                    const bgClass = primaryPlatform
                      ? PLATFORM_BG_CLASSES[primaryPlatform] ?? "bg-gray-500 dark:bg-gray-400"
                      : "bg-gray-500 dark:bg-gray-400";
                    return (
                      <div
                        key={post.id}
                        className={cn("size-2 rounded-full", bgClass)}
                        title={post.title ?? post.caption ?? "Post"}
                      />
                    );
                  })}
                  {dayPosts.length > 4 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayPosts.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
