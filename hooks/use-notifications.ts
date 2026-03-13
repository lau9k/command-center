"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types/database";

const POLL_INTERVAL_MS = 30_000;
const MAX_NOTIFICATIONS = 50;

interface UseNotificationsOptions {
  initialNotifications?: Notification[];
  initialUnreadCount?: number;
}

export function useNotifications({
  initialNotifications = [],
  initialUnreadCount = 0,
}: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const mountedRef = useRef(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const supabase = createClient();
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(MAX_NOTIFICATIONS),
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("read", false),
      ]);

      if (mountedRef.current) {
        if (data) setNotifications(data as Notification[]);
        if (count !== null) setUnreadCount(count);
      }
    } catch {
      // silently fail on poll
    }
  }, []);

  // Real-time subscription for new notifications + toast
  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          if (!mountedRef.current) return;
          const notification = payload.new as Notification;
          setNotifications((prev) =>
            [notification, ...prev].slice(0, MAX_NOTIFICATIONS)
          );
          if (!notification.read) {
            setUnreadCount((c) => c + 1);
          }

          // Show toast popup for new notifications
          toast(notification.title, {
            description: notification.body ?? undefined,
            action: notification.action_url
              ? {
                  label: "View",
                  onClick: () => {
                    window.location.href = notification.action_url!;
                  },
                }
              : undefined,
          });
        }
      )
      .subscribe();

    // Poll for updated notifications every 30s
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
    } catch {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
      setUnreadCount((c) => c + 1);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const previousNotifs = notifications;
    const previousCount = unreadCount;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
    } catch {
      // Revert on failure
      setNotifications(previousNotifs);
      setUnreadCount(previousCount);
    }
  }, [notifications, unreadCount]);

  return { notifications, unreadCount, markAsRead, markAllRead };
}
