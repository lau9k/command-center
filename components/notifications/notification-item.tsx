"use client";

import { CheckCircle, AlertTriangle, Info, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Notification, NotificationType } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const typeIcons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  task: CheckCircle,
  alert: AlertTriangle,
  info: Info,
  signal: Zap,
};

const typeIconColors: Record<NotificationType, string> = {
  task: "text-blue-500",
  alert: "text-amber-500",
  info: "text-gray-400",
  signal: "text-green-500",
};

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const Icon = typeIcons[notification.type];

  return (
    <button
      className={cn(
        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
        !notification.read && "border-l-2 border-l-blue-500 bg-accent/30"
      )}
      onClick={() => {
        if (!notification.read) onRead(notification.id);
      }}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          typeIconColors[notification.type]
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm",
            notification.read ? "font-normal" : "font-medium"
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
    </button>
  );
}
