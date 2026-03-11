"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityItemCard } from "./activity-item";
import type { ActivityFeedItem, ActivityEventType } from "@/lib/types/database";

const FILTER_OPTIONS: { label: string; value: ActivityEventType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Tasks", value: "task_completed" },
  { label: "Deals", value: "deal_moved" },
  { label: "Content", value: "content_published" },
  { label: "System", value: "system" },
];

const PAGE_SIZE = 50;

interface ActivityTimelineProps {
  initialItems: ActivityFeedItem[];
  initialTotal: number;
  initialHasMore: boolean;
}

export function ActivityTimeline({
  initialItems,
  initialTotal,
  initialHasMore,
}: ActivityTimelineProps) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ActivityEventType | "all">("all");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchItems = useCallback(
    async (offset: number, type: ActivityEventType | "all") => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (type !== "all") params.set("type", type);

      const res = await fetch(`/api/activity?${params}`);
      if (!res.ok) return null;
      return res.json() as Promise<{
        items: ActivityFeedItem[];
        total: number;
        hasMore: boolean;
      }>;
    },
    []
  );

  // Re-fetch when filter changes
  useEffect(() => {
    let cancelled = false;

    fetchItems(0, filter).then((data) => {
      if (cancelled || !data) return;
      setItems(data.items);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [filter, fetchItems]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          setLoading(true);
          fetchItems(items.length, filter).then((data) => {
            if (!data) return;
            setItems((prev) => [...prev, ...data.items]);
            setHasMore(data.hasMore);
            setTotal(data.total);
            setLoading(false);
          });
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, items.length, filter, fetchItems]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setLoading(true);
              setFilter(opt.value);
            }}
          >
            {opt.label}
          </Button>
        ))}
        <span className="ml-auto self-center text-xs text-muted-foreground">
          {total} event{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Timeline */}
      {items.length === 0 && !loading ? (
        <EmptyState
          icon={<Activity />}
          title="No activity yet"
          description="Events will appear here as you use the dashboard."
        />
      ) : (
        <div className="mt-2">
          {items.map((item, idx) => (
            <ActivityItemCard
              key={item.id}
              item={item}
              isLast={idx === items.length - 1}
            />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && <div ref={sentinelRef} className="h-px" />}

      {loading && (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}
    </div>
  );
}
