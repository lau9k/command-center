"use client";

import { useState, useEffect, useCallback } from "react";
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
  const supabase = createClient();

  // Real-time subscription for new notifications
  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const notification = payload.new as Notification;
          setNotifications((prev) =>
            [notification, ...prev].slice(0, MAX_NOTIFICATIONS)
          );
          if (!notification.read) {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Poll for updated notifications every 30s
  useEffect(() => {
    async function fetchNotifications() {
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

      if (data) {
        setNotifications(data as Notification[]);
      }
      if (count !== null) {
        setUnreadCount(count);
      }
    }

    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [supabase]);

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
    },
    [supabase]
  );

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    await supabase
      .from("notifications")
      .update({ read: true })
      .in("id", unreadIds);
  }, [supabase, notifications]);

  return { notifications, unreadCount, markAsRead, markAllRead };
}
