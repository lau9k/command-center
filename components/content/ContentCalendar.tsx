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
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Clock, FileText, Image } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FilterBar, type FilterDefinition, type FilterValues } from "@/components/ui/filter-bar";
import { Drawer } from "@/components/ui/drawer";
import { StatusBadge, PlatformBadge, type PlatformType, type StatusType } from "@/components/ui/badge";
import type { ContentPost } from "@/lib/types/database";

type ViewMode = "week" | "month";

type ContentPostWithProject = ContentPost & {
  projects: { id: string; name: string; color: string | null } | null;
};

const PLATFORM_BG_CLASSES: Record<string, string> = {
  linkedin: "bg-blue-700 dark:bg-blue-500",
  twitter: "bg-sky-500 dark:bg-sky-400",
  youtube: "bg-red-600 dark:bg-red-500",
  instagram: "bg-pink-500 dark:bg-pink-400",
  tiktok: "bg-black dark:bg-white",
};

const FILTER_DEFS: FilterDefinition[] = [
  {
    id: "platform",
    label: "Platform",
    options: [
      { label: "LinkedIn", value: "linkedin" },
      { label: "X / Twitter", value: "twitter" },
      { label: "YouTube", value: "youtube" },
      { label: "Instagram", value: "instagram" },
      { label: "TikTok", value: "tiktok" },
    ],
  },
  {
    id: "status",
    label: "Status",
    options: [
      { label: "Draft", value: "draft" },
      { label: "Ready", value: "ready" },
      { label: "Scheduled", value: "scheduled" },
      { label: "Published", value: "published" },
    ],
  },
];

interface ContentCalendarProps {
  initialPosts: ContentPostWithProject[];
}

export function ContentCalendar({ initialPosts }: ContentCalendarProps) {
  const [posts, setPosts] = React.useState<ContentPostWithProject[]>(initialPosts);
  const [viewMode, setViewMode] = React.useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [filterValues, setFilterValues] = React.useState<FilterValues>({
    platform: [],
    status: [],
  });
  const [selectedPost, setSelectedPost] = React.useState<ContentPostWithProject | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Compute date range
  const rangeStart =
    viewMode === "week"
      ? startOfWeek(currentDate, { weekStartsOn: 1 })
      : startOfMonth(currentDate);
  const rangeEnd =
    viewMode === "week"
      ? endOfWeek(currentDate, { weekStartsOn: 1 })
      : endOfMonth(currentDate);

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  // For month view, pad to start of week
  const monthWeekStart = startOfWeek(rangeStart, { weekStartsOn: 1 });
  const monthWeekEnd = endOfWeek(rangeEnd, { weekStartsOn: 1 });
  const monthDays =
    viewMode === "month"
      ? eachDayOfInterval({ start: monthWeekStart, end: monthWeekEnd })
      : days;

  const displayDays = viewMode === "month" ? monthDays : days;

  // Filter posts
  const filteredPosts = React.useMemo(() => {
    return posts.filter((p) => {
      if (filterValues.platform.length > 0 && !filterValues.platform.includes(p.platform ?? "")) {
        return false;
      }
      if (filterValues.status.length > 0 && !filterValues.status.includes(p.status)) {
        return false;
      }
      return true;
    });
  }, [posts, filterValues]);

  // Group posts by date
  const postsByDate = React.useMemo(() => {
    const map = new Map<string, ContentPostWithProject[]>();
    for (const post of filteredPosts) {
      if (!post.scheduled_for) continue;
      const dateKey = format(parseISO(post.scheduled_for), "yyyy-MM-dd");
      const existing = map.get(dateKey) ?? [];
      existing.push(post);
      map.set(dateKey, existing);
    }
    return map;
  }, [filteredPosts]);

  function navigate(direction: "prev" | "next") {
    if (viewMode === "week") {
      setCurrentDate((d) => (direction === "prev" ? subWeeks(d, 1) : addWeeks(d, 1)));
    } else {
      setCurrentDate((d) => (direction === "prev" ? subMonths(d, 1) : addMonths(d, 1)));
    }
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function openPostDrawer(post: ContentPostWithProject) {
    setSelectedPost(post);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedPost(null);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/content-posts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      closeDrawer();
    }
  }

  // Header label
  const headerLabel =
    viewMode === "week"
      ? `${format(rangeStart, "MMM d")} - ${format(rangeEnd, "MMM d, yyyy")}`
      : format(currentDate, "MMMM yyyy");

  return (
    <div className="space-y-4">
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
            onClick={goToToday}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Today
          </Button>
        </div>

        <Button
          size="sm"
          className="bg-blue-500 dark:bg-blue-400 text-white hover:bg-blue-500/90 dark:hover:bg-blue-400/90"
          onClick={() => {
            // Placeholder for create flow
          }}
        >
          <Plus className="mr-1 size-4" />
          New Post
        </Button>
      </div>

      {/* Filters */}
      <FilterBar filters={FILTER_DEFS} values={filterValues} onChange={setFilterValues} />

      {/* Calendar Grid */}
      {viewMode === "week" ? (
        <WeekView
          days={displayDays}
          postsByDate={postsByDate}
          onPostClick={openPostDrawer}
        />
      ) : (
        <MonthView
          days={displayDays}
          postsByDate={postsByDate}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPostClick={openPostDrawer}
        />
      )}

      {/* Post Detail Drawer */}
      <Drawer open={drawerOpen} onClose={closeDrawer} title="Post Detail">
        {selectedPost && (
          <PostDetail post={selectedPost} onDelete={handleDelete} />
        )}
      </Drawer>
    </div>
  );
}

// --- Week View ---

function WeekView({
  days,
  postsByDate,
  onPostClick,
}: {
  days: Date[];
  postsByDate: Map<string, ContentPostWithProject[]>;
  onPostClick: (post: ContentPostWithProject) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-px rounded-xl border border-border bg-border overflow-hidden">
      {days.map((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const dayPosts = postsByDate.get(dateKey) ?? [];
        const today = isToday(day);

        return (
          <div
            key={dateKey}
            className={cn(
              "flex min-h-[160px] flex-col bg-card p-2",
              today && "bg-accent"
            )}
          >
            {/* Day header */}
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-xs font-medium uppercase text-text-muted">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  today
                    ? "bg-blue-500 dark:bg-blue-400 text-white"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>
            </div>

            {/* Post pills */}
            <div className="flex flex-col gap-1">
              {dayPosts.map((post) => (
                <PostPill key={post.id} post={post} onClick={() => onPostClick(post)} />
              ))}
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
}: {
  days: Date[];
  postsByDate: Map<string, ContentPostWithProject[]>;
  rangeStart: Date;
  rangeEnd: Date;
  onPostClick: (post: ContentPostWithProject) => void;
}) {
  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-px mb-px">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-1.5 text-center text-xs font-medium uppercase text-text-muted">
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
            <div
              key={dateKey}
              className={cn(
                "flex min-h-[100px] flex-col bg-card p-2",
                today && "bg-accent",
                !inRange && "opacity-40"
              )}
            >
              <span
                className={cn(
                  "mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  today
                    ? "bg-blue-500 dark:bg-blue-400 text-white"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>

              <div className="flex flex-col gap-0.5">
                {dayPosts.slice(0, 3).map((post) => (
                  <PostPill key={post.id} post={post} compact onClick={() => onPostClick(post)} />
                ))}
                {dayPosts.length > 3 && (
                  <span className="text-[10px] text-text-muted">
                    +{dayPosts.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Post Pill ---

function PostPill({
  post,
  compact = false,
  onClick,
}: {
  post: ContentPostWithProject;
  compact?: boolean;
  onClick: () => void;
}) {
  const bgClass = PLATFORM_BG_CLASSES[post.platform ?? ""] ?? "bg-gray-500 dark:bg-gray-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full truncate rounded-md text-left text-xs font-medium text-white transition-opacity hover:opacity-80",
        compact ? "px-1.5 py-0.5" : "px-2 py-1",
        bgClass
      )}
      title={post.title ?? "Untitled"}
    >
      {post.title ?? "Untitled"}
    </button>
  );
}

// --- Post Detail (Drawer Content) ---

function PostDetail({
  post,
  onDelete,
}: {
  post: ContentPostWithProject;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          {post.title ?? "Untitled Post"}
        </h3>
        {post.projects && (
          <span className="text-xs text-muted-foreground">{post.projects.name}</span>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        {post.platform ? (
          <PlatformBadge platform={post.platform as PlatformType} />
        ) : (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            No platform
          </span>
        )}
        <StatusBadge status={post.status as StatusType} />
        {post.type !== "post" && (
          <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
            {post.type}
          </span>
        )}
      </div>

      {/* Scheduled time */}
      {post.scheduled_for && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4" />
          <span>
            {format(parseISO(post.scheduled_for), "EEE, MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
      )}

      {/* Caption / Body */}
      {post.body && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase text-text-muted">
            <FileText className="size-3" />
            Caption
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {post.body}
          </p>
        </div>
      )}

      {/* Media preview placeholder */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase text-text-muted">
          <Image className="size-3" />
          Media
        </div>
        {post.media_urls && post.media_urls.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {post.media_urls.map((url, i) => (
              <div
                key={i}
                className="flex aspect-video items-center justify-center rounded-lg border border-border bg-accent text-xs text-text-muted"
              >
                {url}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-muted">
            No media attached
          </div>
        )}
      </div>

      {/* Delete action */}
      <div className="border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 dark:text-red-400 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400"
          onClick={() => onDelete(post.id)}
        >
          Delete Post
        </Button>
      </div>
    </div>
  );
}
