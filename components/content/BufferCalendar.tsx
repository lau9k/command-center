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
  getHours,
} from "date-fns";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarPlus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ContentPost, Project } from "@/lib/types/database";
import { BufferPostCard } from "./BufferPostCard";
import { BufferPostDetail } from "./BufferPostDetail";
import { CalendarPostCard } from "./calendar-post-card";
import { CalendarEmpty } from "./calendar-empty";

type ViewMode = "week" | "month";

type PostWithProject = ContentPost & {
  projects?: { id: string; name: string; color: string | null } | null;
};

interface BufferCalendarProps {
  initialPosts: PostWithProject[];
  projects: Pick<Project, "id" | "name" | "color">[];
}

// Time slots for week view: 6AM to 11PM
const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => i + 6);

export function BufferCalendar({
  initialPosts,
  projects,
}: BufferCalendarProps) {
  const [posts, setPosts] = React.useState<PostWithProject[]>(initialPosts);
  const [viewMode, setViewMode] = React.useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedProjectId, setSelectedProjectId] = React.useState<
    string | null
  >(null);
  const [selectedPost, setSelectedPost] =
    React.useState<PostWithProject | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Compute date range
  const rangeStart =
    viewMode === "week"
      ? startOfWeek(currentDate, { weekStartsOn: 0 })
      : startOfMonth(currentDate);
  const rangeEnd =
    viewMode === "week"
      ? endOfWeek(currentDate, { weekStartsOn: 0 })
      : endOfMonth(currentDate);

  // Memoize ISO strings to satisfy exhaustive-deps
  const rangeStartISO = rangeStart.toISOString();
  const rangeEndISO = rangeEnd.toISOString();

  // Fetch posts when range or filters change
  React.useEffect(() => {
    let cancelled = false;

    async function fetchPosts() {
      setLoading(true);
      const params = new URLSearchParams({
        start: rangeStartISO,
        end: rangeEndISO,
      });
      if (selectedProjectId) params.set("project_id", selectedProjectId);

      try {
        const res = await fetch(`/api/content/calendar?${params}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setPosts(data);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPosts();
    return () => {
      cancelled = true;
    };
  }, [rangeStartISO, rangeEndISO, selectedProjectId]);

  // Days for views
  const weekDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  const monthWeekStart = startOfWeek(rangeStart, { weekStartsOn: 0 });
  const monthWeekEnd = endOfWeek(rangeEnd, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({
    start: monthWeekStart,
    end: monthWeekEnd,
  });

  // Group posts by date
  const postsByDate = React.useMemo(() => {
    const map = new Map<string, PostWithProject[]>();
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
      setCurrentDate((d) =>
        direction === "prev" ? subWeeks(d, 1) : addWeeks(d, 1)
      );
    } else {
      setCurrentDate((d) =>
        direction === "prev" ? subMonths(d, 1) : addMonths(d, 1)
      );
    }
  }

  function openDetail(post: PostWithProject) {
    setSelectedPost(post);
    setDetailOpen(true);
  }

  function closeDetail() {
    setDetailOpen(false);
    setSelectedPost(null);
  }

  function handlePostUpdate(updated: PostWithProject) {
    setPosts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    setSelectedPost(updated);
  }

  // Drag-and-drop: reorder posts between calendar slots
  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const postId = result.draggableId;
    const destSlot = result.destination.droppableId; // format: "date-hour" or "date"

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Parse target slot to build new scheduled_at
    const parts = destSlot.split("-");
    let newDate: string;
    if (parts.length === 4) {
      // week view: "yyyy-MM-dd-HH"
      const [y, m, d, h] = parts;
      newDate = `${y}-${m}-${d}T${h.padStart(2, "0")}:00:00.000Z`;
    } else {
      // month view: "yyyy-MM-dd" — keep original time
      const existing = post.scheduled_at ?? post.scheduled_for;
      if (existing) {
        const dt = parseISO(existing);
        newDate = `${destSlot}T${format(dt, "HH:mm:ss")}.000Z`;
      } else {
        newDate = `${destSlot}T09:00:00.000Z`;
      }
    }

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, scheduled_at: newDate, updated_at: new Date().toISOString() }
          : p
      )
    );

    // Persist
    fetch("/api/content-posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: postId, scheduled_at: newDate }),
    }).catch(() => {
      // Revert on failure
      setPosts((prev) =>
        prev.map((p) => (p.id === postId && post ? post : p))
      );
    });
  }

  const headerLabel =
    viewMode === "week"
      ? `${format(rangeStart, "MMM d")} – ${format(rangeEnd, "MMM d, yyyy")}`
      : format(currentDate, "MMMM yyyy");

  return (
    <div className="space-y-4">
      {/* CalendarHeader */}
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

          <span className="text-sm font-medium text-foreground">
            {headerLabel}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Project filter */}
          <select
            value={selectedProjectId ?? ""}
            onChange={(e) =>
              setSelectedProjectId(e.target.value || null)
            }
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* New Post */}
          <Button
            size="sm"
            className="bg-blue-500 dark:bg-blue-400 text-white hover:bg-blue-500/90 dark:hover:bg-blue-400/90"
          >
            <Plus className="mr-1 size-4" />
            New Post
          </Button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-border border-t-blue-500 dark:border-t-blue-400" />
        </div>
      )}

      {/* Calendar views with drag-and-drop */}
      {!loading && (
        <DragDropContext onDragEnd={handleDragEnd}>
          {viewMode === "week" && posts.length > 0 && (
            <WeekView
              days={weekDays}
              posts={posts}
              onPostClick={openDetail}
            />
          )}

          {viewMode === "month" && posts.length > 0 && (
            <MonthView
              days={monthDays}
              postsByDate={postsByDate}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPostClick={openDetail}
            />
          )}
        </DragDropContext>
      )}

      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <CalendarEmpty viewMode={viewMode} />
      )}

      {/* PostDetail slide-out */}
      <BufferPostDetail
        open={detailOpen}
        post={selectedPost}
        onClose={closeDetail}
        onUpdate={handlePostUpdate}
      />
    </div>
  );
}

// --- Week View with Time Slots ---

function WeekView({
  days,
  posts,
  onPostClick,
}: {
  days: Date[];
  posts: PostWithProject[];
  onPostClick: (post: PostWithProject) => void;
}) {
  // Group posts by date+hour for time slot placement
  const postsByDateHour = React.useMemo(() => {
    const map = new Map<string, PostWithProject[]>();
    for (const post of posts) {
      const dateStr = post.scheduled_at ?? post.scheduled_for;
      if (!dateStr) continue;
      const dt = parseISO(dateStr);
      const dateKey = format(dt, "yyyy-MM-dd");
      const hour = getHours(dt);
      const key = `${dateKey}-${hour}`;
      const existing = map.get(key) ?? [];
      existing.push(post);
      map.set(key, existing);
    }
    return map;
  }, [posts]);

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border bg-card">
        <div className="border-r border-border" />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r border-border px-2 py-2 text-center last:border-r-0",
                today && "bg-blue-500/5 dark:bg-blue-400/5"
              )}
            >
              <span className="text-xs font-medium uppercase text-muted-foreground">
                {format(day, "EEE")}
              </span>
              <div
                className={cn(
                  "mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full text-sm font-medium",
                  today ? "bg-blue-500 dark:bg-blue-400 text-white" : "text-foreground"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {TIME_SLOTS.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border last:border-b-0"
          >
            {/* Time label */}
            <div className="flex items-start justify-end border-r border-border px-2 py-1">
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {hour === 0
                  ? "12 AM"
                  : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                      ? "12 PM"
                      : `${hour - 12} PM`}
              </span>
            </div>

            {/* Day cells for this hour */}
            {days.map((day) => {
              const today = isToday(day);
              const dateKey = format(day, "yyyy-MM-dd");
              const cellKey = `${dateKey}-${hour}`;
              const cellPosts = postsByDateHour.get(cellKey) ?? [];

              return (
                <Droppable
                  key={cellKey}
                  droppableId={cellKey}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[48px] border-r border-border p-0.5 last:border-r-0 transition-colors",
                        today && "border-l-2 border-l-blue-500 dark:border-l-blue-400 bg-blue-500/5 dark:bg-blue-400/5",
                        snapshot.isDraggingOver &&
                          "bg-blue-500/10 dark:bg-blue-400/10"
                      )}
                    >
                      {cellPosts.map((post, index) => (
                        <Draggable
                          key={post.id}
                          draggableId={post.id}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              <BufferPostCard
                                post={post}
                                compact
                                onClick={() => onPostClick(post)}
                                isDragging={dragSnapshot.isDragging}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        ))}
      </div>
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
  postsByDate: Map<string, PostWithProject[]>;
  rangeStart: Date;
  rangeEnd: Date;
  onPostClick: (post: PostWithProject) => void;
}) {
  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-px mb-px">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
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
            <Droppable key={dateKey} droppableId={dateKey}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "flex min-h-[110px] flex-col bg-card p-2 transition-colors",
                    today && "bg-blue-500/5 dark:bg-blue-400/5",
                    !inRange && "opacity-40",
                    snapshot.isDraggingOver && "bg-blue-500/10 dark:bg-blue-400/10"
                  )}
                >
                  <span
                    className={cn(
                      "mb-1.5 flex size-6 items-center justify-center rounded-full text-xs font-medium",
                      today ? "bg-blue-500 dark:bg-blue-400 text-white" : "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>

                  <div className="flex flex-col gap-1">
                    {dayPosts.slice(0, 3).map((post, index) => (
                      <Draggable
                        key={post.id}
                        draggableId={post.id}
                        index={index}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <CalendarPostCard
                              post={post}
                              onClick={() => onPostClick(post)}
                              isDragging={dragSnapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {dayPosts.length > 3 && (
                      <span className="text-[10px] text-muted-foreground pl-1">
                        +{dayPosts.length - 3} more
                      </span>
                    )}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </div>
  );
}
