"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  parseISO,
} from "date-fns";
import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ContentPost } from "@/lib/types/database";
import { PLATFORM_COLORS } from "@/lib/types/database";

interface ContentCalendarPreviewProps {
  posts: ContentPost[];
}

export function ContentCalendarPreview({ posts }: ContentCalendarPreviewProps) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Pad to full weeks for a proper calendar grid
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Filter to this month's posts
  const monthPosts = posts.filter((post) => {
    const dateStr = post.scheduled_at ?? post.scheduled_for;
    if (!dateStr) return false;
    const d = parseISO(dateStr);
    return d >= monthStart && d <= monthEnd;
  });

  // Group posts by date
  const postsByDate = new Map<string, ContentPost[]>();
  for (const post of monthPosts) {
    const dateStr = post.scheduled_at ?? post.scheduled_for;
    if (!dateStr) continue;
    const dateKey = format(parseISO(dateStr), "yyyy-MM-dd");
    const existing = postsByDate.get(dateKey) ?? [];
    existing.push(post);
    postsByDate.set(dateKey, existing);
  }

  const totalThisMonth = monthPosts.length;

  if (totalThisMonth === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Content Calendar</h2>
        <Link
          href="/content"
          className="text-xs text-sidebar-primary hover:underline"
        >
          View all
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        {/* Header stats */}
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            {format(now, "MMMM yyyy")}
          </span>
          <span className="text-xs text-muted-foreground">
            {totalThisMonth} post{totalThisMonth !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-px mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-medium uppercase text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7 gap-px">
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayPosts = postsByDate.get(dateKey) ?? [];
            const today = isToday(day);
            const inMonth = day >= monthStart && day <= monthEnd;

            return (
              <div
                key={dateKey}
                className={cn(
                  "flex flex-col items-center rounded p-1 transition-colors",
                  today && "bg-accent",
                  !inMonth && "opacity-30"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-[10px] font-medium",
                    today ? "bg-sidebar-primary text-white" : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Post dots */}
                <div className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                  {dayPosts.slice(0, 3).map((post) => {
                    const platforms = post.platforms ?? [];
                    const primary = platforms[0] ?? post.platform;
                    const color = primary ? PLATFORM_COLORS[primary] ?? "#666" : "#666";
                    return (
                      <span
                        key={post.id}
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upcoming posts list */}
        {monthPosts.length > 0 && (
          <div className="mt-3 border-t border-border pt-3 space-y-2">
            {monthPosts.slice(0, 5).map((post) => {
              const dateStr = post.scheduled_at ?? post.scheduled_for;
              const platforms = post.platforms ?? [];
              const primary = platforms[0] ?? post.platform;
              const color = primary ? PLATFORM_COLORS[primary] ?? "#666" : "#666";

              return (
                <div
                  key={post.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-foreground">
                      {post.title || post.caption?.slice(0, 50) || "Untitled post"}
                    </span>
                  </div>
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                    {dateStr ? format(parseISO(dateStr), "MMM d, h:mma") : "No date"}
                  </span>
                </div>
              );
            })}
            {monthPosts.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{monthPosts.length - 5} more
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
