"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Archive,
  X,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/types/database";

interface InboxResponse {
  data: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

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

const typeLabels: Record<NotificationType, string> = {
  task: "Task",
  alert: "Alert",
  info: "Info",
  signal: "Signal",
};

interface NotificationInboxProps {
  initialUnreadCount: number;
}

export function NotificationInbox({ initialUnreadCount }: NotificationInboxProps) {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [archiving, setArchiving] = useState(false);

  const queryKey = ["notifications", "inbox", typeFilter, statusFilter, page];

  const { data: inbox, isLoading } = useQuery<InboxResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("pageSize", "20");

      const res = await fetch(`/api/notifications/inbox?${params}`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: unreadCount = initialUnreadCount } = useQuery<number>({
    queryKey: ["notifications", "unreadCount"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?unread=true&limit=1");
      if (!res.ok) return 0;
      const json = await res.json();
      return json.data?.length ?? 0;
    },
    staleTime: 30_000,
    initialData: initialUnreadCount,
  });

  const notifications = inbox?.data ?? [];
  const totalPages = inbox?.totalPages ?? 1;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  }, [selectedIds.size, notifications]);

  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      toast.error("Failed to mark notification as read");
    }
  }, [queryClient]);

  const handleBulkArchive = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setArchiving(true);
    try {
      const res = await fetch("/api/notifications/inbox", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Failed to archive");
      const { archived } = await res.json();
      toast.success(`Archived ${archived} notification${archived !== 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      toast.error("Failed to archive notifications");
    } finally {
      setArchiving(false);
    }
  }, [selectedIds, queryClient]);

  const handleFilterChange = useCallback((setter: (v: string) => void) => {
    return (value: string) => {
      setter(value);
      setPage(1);
      setSelectedIds(new Set());
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Unread badge + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {unreadCount} unread
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={handleFilterChange(setTypeFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="alert">Alert</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="signal">Signal</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notification list */}
      <div className="rounded-lg border bg-card">
        {/* Select all header */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-3 border-b px-4 py-2">
            <Checkbox
              checked={
                notifications.length > 0 && selectedIds.size === notifications.length
              }
              onCheckedChange={toggleSelectAll}
              aria-label="Select all notifications"
            />
            <span className="text-xs text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : "Select all"}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications found</p>
          </div>
        ) : (
          <ul className="divide-y">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type];
              const isSelected = selectedIds.has(notification.id);

              return (
                <li
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
                    !notification.read && "border-l-2 border-l-blue-500 bg-accent/30"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(notification.id)}
                    className="mt-1"
                    aria-label={`Select notification: ${notification.title}`}
                  />
                  <button
                    className="flex min-w-0 flex-1 gap-3 text-left"
                    onClick={() => {
                      if (!notification.read) handleMarkAsRead(notification.id);
                      if (notification.action_url) {
                        window.location.href = notification.action_url;
                      }
                    }}
                  >
                    <Icon
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        typeIconColors[notification.type]
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            notification.read ? "font-normal" : "font-medium"
                          )}
                        >
                          {notification.title}
                        </p>
                        <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                          {typeLabels[notification.type]}
                        </Badge>
                      </div>
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
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground tabular-nums">
            Page {page} of {totalPages} ({inbox?.total ?? 0} total)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-2.5 shadow-lg">
            <span className="text-sm font-medium tabular-nums">
              {selectedIds.size} selected
            </span>

            <div className="h-5 w-px bg-border" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkArchive}
              disabled={archiving}
            >
              <Archive className="mr-1 size-4" />
              Archive
            </Button>

            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setSelectedIds(new Set())}
              aria-label="Clear selection"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
