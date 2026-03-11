"use client";

import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { PlatformBadge, StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContentItem, ContentItemStatus } from "@/lib/types/database";

const STATUS_DOT: Record<ContentItemStatus, string> = {
  draft: "bg-[#666666]",
  scheduled: "bg-[#3B82F6]",
  published: "bg-[#22C55E]",
  failed: "bg-[#EF4444]",
};

const STATUS_MAP: Record<ContentItemStatus, "draft" | "scheduled" | "published" | "failed"> = {
  draft: "draft",
  scheduled: "scheduled",
  published: "published",
  failed: "failed",
};

interface ContentItemCalendarProps {
  items: ContentItem[];
  month: Date;
  onMonthChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ContentItemCalendar({
  items,
  month,
  onMonthChange,
  onDayClick,
}: ContentItemCalendarProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [month]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    for (const item of items) {
      const dateStr = item.scheduled_for;
      if (!dateStr) continue;
      const dayKey = format(new Date(dateStr), "yyyy-MM-dd");
      const existing = map.get(dayKey) ?? [];
      existing.push(item);
      map.set(dayKey, existing);
    }
    return map;
  }, [items]);

  function handlePrevMonth() {
    const prev = new Date(month);
    prev.setMonth(prev.getMonth() - 1);
    onMonthChange(prev);
  }

  function handleNextMonth() {
    const next = new Date(month);
    next.setMonth(next.getMonth() + 1);
    onMonthChange(next);
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-accent cursor-pointer"
        >
          &larr; Prev
        </button>
        <h2 className="text-lg font-semibold">
          {format(month, "MMMM yyyy")}
        </h2>
        <button
          type="button"
          onClick={handleNextMonth}
          className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-accent cursor-pointer"
        >
          Next &rarr;
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-lg border bg-border overflow-hidden">
        {calendarDays.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayItems = itemsByDay.get(dayKey) ?? [];
          const isCurrentMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => onDayClick(day)}
              className={cn(
                "flex min-h-[100px] flex-col gap-1 bg-background p-2 text-left transition-colors hover:bg-accent/50 cursor-pointer",
                !isCurrentMonth && "opacity-40"
              )}
            >
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary text-primary-foreground font-bold"
                )}
              >
                {format(day, "d")}
              </span>

              {dayItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1"
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      STATUS_DOT[item.status]
                    )}
                  />
                  <PlatformBadge
                    platform={item.platform}
                    className="scale-75 origin-left"
                  />
                </div>
              ))}

              {dayItems.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{dayItems.length - 3} more
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {(Object.entries(STATUS_DOT) as [ContentItemStatus, string][]).map(
          ([status, dotClass]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", dotClass)} />
              <StatusBadge status={STATUS_MAP[status]} />
            </div>
          )
        )}
      </div>
    </div>
  );
}
