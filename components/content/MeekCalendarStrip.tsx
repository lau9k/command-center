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
    const dateStr = post.scheduled_for;
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
          className="text-xs text-blue-500 dark:text-blue-400 hover:underline"
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
          <span className="font-semibold text-blue-500 dark:text-blue-400">{scheduledCount}</span> scheduled
        </span>
        <span className="text-xs text-muted-foreground">
          <span className="font-semibold text-green-500 dark:text-green-400">{publishedCount}</span> published
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
                  today ? "bg-blue-500 dark:bg-blue-400 text-white" : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Post dots */}
              <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                {dayPosts.slice(0, 3).map((post) => {
                  const platforms = post.platforms ?? [];
                  const primary = platforms[0] ?? post.platform;
                  const bgClass = primary ? PLATFORM_BG_CLASSES[primary] ?? "bg-gray-500 dark:bg-gray-400" : "bg-gray-500 dark:bg-gray-400";
                  return (
                    <span
                      key={post.id}
                      className={cn("size-1.5 rounded-full", bgClass)}
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
