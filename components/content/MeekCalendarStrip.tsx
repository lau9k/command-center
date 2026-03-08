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

interface MeekCalendarStripProps {
  posts: ContentPost[];
  projectId: string;
}

export function MeekCalendarStrip({ posts, projectId }: MeekCalendarStripProps) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Group posts by date
  const postsByDate = new Map<string, ContentPost[]>();
  for (const post of posts) {
    const dateStr = post.scheduled_at ?? post.scheduled_for;
    if (!dateStr) continue;
    const dateKey = format(parseISO(dateStr), "yyyy-MM-dd");
    const existing = postsByDate.get(dateKey) ?? [];
    existing.push(post);
    postsByDate.set(dateKey, existing);
  }

  const draftCount = posts.filter((p) => p.status === "draft").length;
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
  const publishedCount = posts.filter((p) => p.status === "published").length;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Content Calendar</h3>
        </div>
        <Link
          href={`/projects/${projectId}/content`}
          className="text-xs text-[#3B82F6] hover:underline"
        >
          View all
        </Link>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{draftCount}</span> drafts
        </span>
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-[#3B82F6]">{scheduledCount}</span> scheduled
        </span>
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-[#22C55E]">{publishedCount}</span> published
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
                "flex flex-col items-center rounded-lg p-1.5 transition-colors",
                today && "bg-accent"
              )}
            >
              <span className="text-[10px] font-medium uppercase text-muted-foreground">
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  today ? "bg-[#3B82F6] text-white" : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Post dots */}
              <div className="mt-1 flex flex-wrap justify-center gap-0.5">
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

              {dayPosts.length > 0 && (
                <span className="mt-0.5 text-[10px] text-muted-foreground">
                  {dayPosts.length}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
