"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationDrawer } from "@/components/notifications/notification-drawer";
import { useNotifications } from "@/hooks/use-notifications";
import type { Notification } from "@/lib/types/database";

interface NotificationBellProps {
  initialNotifications: Notification[];
  initialUnreadCount: number;
}

export function NotificationBell({
  initialNotifications,
  initialUnreadCount,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllRead } =
    useNotifications({
      initialNotifications,
      initialUnreadCount,
    });

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="sr-only">
          {unreadCount} unread notifications
        </span>
      </Button>

      <NotificationDrawer
        open={open}
        onOpenChange={setOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllRead={markAllRead}
      />
    </>
  );
}
