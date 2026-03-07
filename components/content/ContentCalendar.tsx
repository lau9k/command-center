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

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0A66C2",
  twitter: "#1DA1F2",
  youtube: "#FF0000",
  instagram: "#E4405F",
  tiktok: "#000000",
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
          <div className="inline-flex rounded-lg border border-[#2A2A2A] bg-[#141414]">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors rounded-l-lg",
                viewMode === "week"
                  ? "bg-[#3B82F6] text-white"
                  : "text-[#A0A0A0] hover:text-[#FAFAFA]"
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
                  ? "bg-[#3B82F6] text-white"
                  : "text-[#A0A0A0] hover:text-[#FAFAFA]"
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
              className="size-8 text-[#A0A0A0] hover:text-[#FAFAFA]"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("next")}
              className="size-8 text-[#A0A0A0] hover:text-[#FAFAFA]"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <span className="text-sm font-medium text-[#FAFAFA]">{headerLabel}</span>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-xs text-[#A0A0A0] hover:text-[#FAFAFA]"
          >
            Today
          </Button>
        </div>

        <Button
          size="sm"
          className="bg-[#3B82F6] text-white hover:bg-[#3B82F6]/90"
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
    <div className="grid grid-cols-7 gap-px rounded-xl border border-[#2A2A2A] bg-[#2A2A2A] overflow-hidden">
      {days.map((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const dayPosts = postsByDate.get(dateKey) ?? [];
        const today = isToday(day);

        return (
          <div
            key={dateKey}
            className={cn(
              "flex min-h-[160px] flex-col bg-[#141414] p-2",
              today && "bg-[#1E1E1E]"
            )}
          >
            {/* Day header */}
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-xs font-medium uppercase text-[#666666]">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  today
                    ? "bg-[#3B82F6] text-white"
                    : "text-[#FAFAFA]"
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
          <div key={d} className="px-2 py-1.5 text-center text-xs font-medium uppercase text-[#666666]">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px rounded-xl border border-[#2A2A2A] bg-[#2A2A2A] overflow-hidden">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDate.get(dateKey) ?? [];
          const today = isToday(day);
          const inRange = day >= rangeStart && day <= rangeEnd;

          return (
            <div
              key={dateKey}
              className={cn(
                "flex min-h-[100px] flex-col bg-[#141414] p-2",
                today && "bg-[#1E1E1E]",
                !inRange && "opacity-40"
              )}
            >
              <span
                className={cn(
                  "mb-1 flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  today
                    ? "bg-[#3B82F6] text-white"
                    : "text-[#FAFAFA]"
                )}
              >
                {format(day, "d")}
              </span>

              <div className="flex flex-col gap-0.5">
                {dayPosts.slice(0, 3).map((post) => (
                  <PostPill key={post.id} post={post} compact onClick={() => onPostClick(post)} />
                ))}
                {dayPosts.length > 3 && (
                  <span className="text-[10px] text-[#666666]">
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
  const color = PLATFORM_COLORS[post.platform ?? ""] ?? "#666666";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full truncate rounded-md text-left text-xs font-medium text-white transition-opacity hover:opacity-80",
        compact ? "px-1.5 py-0.5" : "px-2 py-1"
      )}
      style={{ backgroundColor: color }}
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
        <h3 className="text-lg font-semibold text-[#FAFAFA]">
          {post.title ?? "Untitled Post"}
        </h3>
        {post.projects && (
          <span className="text-xs text-[#A0A0A0]">{post.projects.name}</span>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        {post.platform && (
          <PlatformBadge platform={post.platform as PlatformType} />
        )}
        <StatusBadge status={post.status as StatusType} />
        {post.type !== "post" && (
          <span className="inline-flex items-center rounded-full bg-[#1E1E1E] px-2 py-0.5 text-xs text-[#A0A0A0]">
            {post.type}
          </span>
        )}
      </div>

      {/* Scheduled time */}
      {post.scheduled_for && (
        <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
          <Clock className="size-4" />
          <span>
            {format(parseISO(post.scheduled_for), "EEE, MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
      )}

      {/* Caption / Body */}
      {post.body && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase text-[#666666]">
            <FileText className="size-3" />
            Caption
          </div>
          <p className="whitespace-pre-wrap text-sm text-[#FAFAFA] leading-relaxed">
            {post.body}
          </p>
        </div>
      )}

      {/* Media preview placeholder */}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase text-[#666666]">
          <Image className="size-3" />
          Media
        </div>
        {post.media_urls && post.media_urls.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {post.media_urls.map((url, i) => (
              <div
                key={i}
                className="flex aspect-video items-center justify-center rounded-lg border border-[#2A2A2A] bg-[#1E1E1E] text-xs text-[#666666]"
              >
                {url}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-[#2A2A2A] text-xs text-[#666666]">
            No media attached
          </div>
        )}
      </div>

      {/* Delete action */}
      <div className="border-t border-[#2A2A2A] pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
          onClick={() => onDelete(post.id)}
        >
          Delete Post
        </Button>
      </div>
    </div>
  );
}
