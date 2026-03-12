"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { Notification, NotificationType } from "@/lib/types/database";

const REFRESH_INTERVAL_MS = 30_000;

const typeIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  task: CheckCircle,
  alert: AlertTriangle,
  info: Info,
  signal: Zap,
};

const typeIconColors: Record<NotificationType, string> = {
  task: "text-blue-500",
  alert: "text-amber-500",
  info: "text-gray-400 dark:text-gray-500",
  signal: "text-green-500",
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (res.ok) {
        const json = (await res.json()) as { data: Notification[] };
        setNotifications(json.data);
      }
    } catch {
      // Keep showing last known data
    } finally {
      setIsRefreshing(false);
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(fetchNotifications, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await fetch(`/api/notifications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unreadIds }),
    });
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!isLoaded) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        <div className="flex items-center justify-center rounded-lg border border-border bg-card py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (notifications.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        <EmptyState
          title="No notifications"
          description="You're all caught up. New notifications will appear here."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          {unreadCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[11px] font-medium text-white">
              {unreadCount}
            </span>
          )}
          {isRefreshing && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto gap-1 px-2 py-1 text-xs text-muted-foreground"
            onClick={markAllRead}
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <ul className="divide-y divide-border">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type];
            return (
              <li key={notification.id}>
                <button
                  className={cn(
                    "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30",
                    !notification.read && "border-l-2 border-l-blue-500 bg-accent/30"
                  )}
                  onClick={() => {
                    if (!notification.read) void markAsRead(notification.id);
                  }}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      typeIconColors[notification.type]
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm",
                        notification.read ? "font-normal text-foreground" : "font-medium text-foreground"
                      )}
                    >
                      {notification.title}
                    </p>
                    {notification.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relativeTime(notification.created_at)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
