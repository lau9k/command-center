"use client";

import {
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
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Filter to this week's posts
  const weekPosts = posts.filter((post) => {
    const dateStr = post.scheduled_at ?? post.scheduled_for;
    if (!dateStr) return false;
    const d = parseISO(dateStr);
    return d >= weekStart && d <= weekEnd;
  });

  // Group posts by date
  const postsByDate = new Map<string, ContentPost[]>();
  for (const post of weekPosts) {
    const dateStr = post.scheduled_at ?? post.scheduled_for;
    if (!dateStr) continue;
    const dateKey = format(parseISO(dateStr), "yyyy-MM-dd");
    const existing = postsByDate.get(dateKey) ?? [];
    existing.push(post);
    postsByDate.set(dateKey, existing);
  }

  const totalThisWeek = weekPosts.length;

  if (totalThisWeek === 0) return null;

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
          <span className="text-sm font-semibold text-foreground">This Week</span>
          <span className="text-xs text-muted-foreground">
            {totalThisWeek} post{totalThisWeek !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Week strip */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayPosts = postsByDate.get(dateKey) ?? [];
            const today = isToday(day);

            return (
              <div
                key={dateKey}
                className={cn(
                  "flex flex-col items-center rounded-lg p-2 transition-colors",
                  today && "bg-accent"
                )}
              >
                <span className="text-[10px] font-medium uppercase text-muted-foreground">
                  {format(day, "EEE")}
                </span>
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-medium",
                    today ? "bg-sidebar-primary text-white" : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>

                {/* Post dots */}
                <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                  {dayPosts.slice(0, 4).map((post) => {
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

                {dayPosts.length > 0 && (
                  <span className="mt-0.5 text-[10px] text-muted-foreground">
                    {dayPosts.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Post list for this week */}
        {weekPosts.length > 0 && (
          <div className="mt-3 border-t border-border pt-3 space-y-2">
            {weekPosts.slice(0, 5).map((post) => {
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
                    {dateStr ? format(parseISO(dateStr), "EEE h:mma") : "No date"}
                  </span>
                </div>
              );
            })}
            {weekPosts.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{weekPosts.length - 5} more
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
