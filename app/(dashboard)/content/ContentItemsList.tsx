"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Calendar,
  List,
  ListFilter,
  FileText,
} from "lucide-react";
import { format, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDeleteModal } from "@/components/dashboard/ConfirmDeleteModal";
import { ContentItemCard } from "./ContentItemCard";
import { ContentItemCalendar } from "./ContentItemCalendar";
import { cn } from "@/lib/utils";
import type { ContentItem } from "@/lib/types/database";

type ViewMode = "list" | "calendar";

const ALL_VALUE = "__all__";

interface ContentItemsListProps {
  initialItems: ContentItem[];
}

export function ContentItemsList({ initialItems }: ContentItemsListProps) {
  const [items, setItems] = useState<ContentItem[]>(initialItems);
  const [view, setView] = useState<ViewMode>("list");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [filterPlatform, setFilterPlatform] = useState<string>(ALL_VALUE);
  const [filterBrand, setFilterBrand] = useState<string>(ALL_VALUE);
  const [filterStatus, setFilterStatus] = useState<string>(ALL_VALUE);

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshItems = useCallback(async () => {
    try {
      const res = await fetch("/api/content-items");
      if (res.ok) {
        const json = await res.json();
        setItems((json.data as ContentItem[]) ?? []);
      }
    } catch {
      // silent
    }
  }, []);

  const handleUpdate = useCallback(
    async (id: string, fields: Partial<ContentItem>) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...fields } : item))
      );

      try {
        const res = await fetch(`/api/content-items/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success("Content updated");
        await refreshItems();
      } catch {
        await refreshItems();
        toast.error("Failed to update — try again");
      }
    },
    [refreshItems]
  );

  const handlePublish = useCallback(
    async (id: string) => {
      setPublishingId(id);
      try {
        const res = await fetch("/api/content/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentItemId: id }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to publish");
        }
        toast.success("Published to Late.so");
        await refreshItems();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to publish";
        toast.error(message);
      } finally {
        setPublishingId(null);
      }
    },
    [refreshItems]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));

    try {
      const res = await fetch(`/api/content-items/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Content deleted");
      setDeleteTarget(null);
    } catch {
      await refreshItems();
      toast.error("Failed to delete — try again");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, refreshItems]);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDay((prev) =>
      prev && isSameDay(prev, date) ? null : date
    );
    setView("list");
  }, []);

  // Apply filters
  const filtered = items.filter((item) => {
    if (filterPlatform !== ALL_VALUE && item.platform !== filterPlatform)
      return false;
    if (filterBrand !== ALL_VALUE && item.brand !== filterBrand) return false;
    if (filterStatus !== ALL_VALUE && item.status !== filterStatus) return false;
    if (selectedDay && item.scheduled_for) {
      if (!isSameDay(new Date(item.scheduled_for), selectedDay)) return false;
    } else if (selectedDay && !item.scheduled_for) {
      return false;
    }
    return true;
  });

  const hasFilters =
    filterPlatform !== ALL_VALUE ||
    filterBrand !== ALL_VALUE ||
    filterStatus !== ALL_VALUE ||
    selectedDay !== null;

  function clearFilters() {
    setFilterPlatform(ALL_VALUE);
    setFilterBrand(ALL_VALUE);
    setFilterStatus(ALL_VALUE);
    setSelectedDay(null);
  }

  // KPI counts
  const draftCount = items.filter((i) => i.status === "draft").length;
  const scheduledCount = items.filter((i) => i.status === "scheduled").length;
  const publishedCount = items.filter((i) => i.status === "published").length;
  const failedCount = items.filter((i) => i.status === "failed").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Content Review
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} content item{items.length !== 1 ? "s" : ""} &mdash;{" "}
            {draftCount} draft{draftCount !== 1 ? "s" : ""},{" "}
            {scheduledCount} scheduled, {publishedCount} published
            {failedCount > 0 && `, ${failedCount} failed`}
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-border bg-background p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setView("list");
              setSelectedDay(null);
            }}
            className={cn(
              "gap-1.5 px-3",
              view === "list" && "bg-accent text-foreground"
            )}
          >
            <List className="size-4" />
            List
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("calendar")}
            className={cn(
              "gap-1.5 px-3",
              view === "calendar" && "bg-accent text-foreground"
            )}
          >
            <Calendar className="size-4" />
            Calendar
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ListFilter className="hidden size-4 text-muted-foreground sm:block" />

        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Platforms</SelectItem>
            <SelectItem value="twitter">Twitter/X</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="telegram">Telegram</SelectItem>
            <SelectItem value="bluesky">Bluesky</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="reddit">Reddit</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Brands</SelectItem>
            <SelectItem value="meek">Meek</SelectItem>
            <SelectItem value="personize">Personize</SelectItem>
            <SelectItem value="buildervault">BuilderVault</SelectItem>
            <SelectItem value="telco">Telco</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        {selectedDay && (
          <span className="text-xs text-muted-foreground">
            Showing: {format(selectedDay, "MMM d, yyyy")}
          </span>
        )}

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Content */}
      {view === "calendar" ? (
        <ContentItemCalendar
          items={items}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          onDayClick={handleDayClick}
        />
      ) : filtered.length === 0 && items.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No content items yet"
          description="AI-generated content drafts will appear here for review."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ListFilter />}
          title="No items match the current filters"
          description="Try adjusting your filters."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <ContentItemCard
              key={item.id}
              item={item}
              onUpdate={handleUpdate}
              onPublish={handlePublish}
              onDelete={setDeleteTarget}
              publishing={publishingId === item.id}
            />
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete content item"
        description={
          deleteTarget
            ? `Are you sure you want to delete this ${deleteTarget.platform} post? This action cannot be undone.`
            : undefined
        }
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
