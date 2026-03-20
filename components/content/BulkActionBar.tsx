"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { CalendarClock, Send, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import type { ContentPost } from "@/lib/types/database";

interface BulkActionBarProps {
  selectedIds: Set<string>;
  posts: ContentPost[];
  totalCount: number;
  onClear: () => void;
  onBulkUpdate: () => Promise<void>;
}

export function BulkActionBar({
  selectedIds,
  posts,
  totalCount,
  onClear,
  onBulkUpdate,
}: BulkActionBarProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduling, setScheduling] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState({ done: 0, total: 0 });

  const count = selectedIds.size;
  if (count === 0) return null;

  const selectedPosts = posts.filter((p) => selectedIds.has(p.id));
  const publishableCount = selectedPosts.filter(
    (p) => p.status === "scheduled" || p.status === "ready"
  ).length;
  const schedulableCount = selectedPosts.filter(
    (p) => p.status === "draft" || p.status === "ready"
  ).length;

  const handleSchedule = useCallback(async () => {
    if (!scheduledDate) return;
    setScheduling(true);

    const toSchedule = selectedPosts.filter(
      (p) => p.status === "draft" || p.status === "ready"
    );

    try {
      const results = await Promise.allSettled(
        toSchedule.map((post) =>
          fetch("/api/content-posts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: post.id,
              status: "scheduled",
              scheduled_at: scheduledDate.toISOString(),
            }),
          })
        )
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;

      if (failed > 0) {
        toast.error(`Scheduled ${succeeded} posts, ${failed} failed`);
      } else {
        toast.success(
          `Scheduled ${succeeded} post${succeeded !== 1 ? "s" : ""} for ${format(scheduledDate, "MMM d, yyyy")}`
        );
      }

      setScheduleOpen(false);
      setScheduledDate(undefined);
      onClear();
      await onBulkUpdate();
    } catch {
      toast.error("Failed to schedule posts");
    } finally {
      setScheduling(false);
    }
  }, [scheduledDate, selectedPosts, onClear, onBulkUpdate]);

  const handlePublish = useCallback(async () => {
    const toPublish = selectedPosts.filter(
      (p) => p.status === "scheduled" || p.status === "ready"
    );

    if (toPublish.length === 0) {
      toast.error("No publishable posts selected");
      return;
    }

    setPublishing(true);
    setPublishProgress({ done: 0, total: toPublish.length });

    let succeeded = 0;
    let failed = 0;

    for (const post of toPublish) {
      try {
        const platforms = post.platforms?.length
          ? post.platforms
          : post.platform
            ? [post.platform]
            : ["linkedin"];

        const res = await fetch("/api/content/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content_post_id: post.id,
            platforms,
          }),
        });

        if (res.ok) {
          succeeded++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      setPublishProgress({ done: succeeded + failed, total: toPublish.length });
    }

    if (failed > 0) {
      toast.error(`Published ${succeeded} posts, ${failed} failed`);
    } else {
      toast.success(
        `Published ${succeeded} post${succeeded !== 1 ? "s" : ""} to Zernio`
      );
    }

    setPublishing(false);
    setPublishProgress({ done: 0, total: 0 });
    onClear();
    await onBulkUpdate();
  }, [selectedPosts, onClear, onBulkUpdate]);

  const isProcessing = scheduling || publishing;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-200">
        <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-2.5 shadow-lg">
          <span className="text-sm font-medium tabular-nums">
            {count} of {totalCount} selected
          </span>

          <div className="h-5 w-px bg-border" />

          {schedulableCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScheduleOpen(true)}
              disabled={isProcessing}
              className="gap-1.5"
            >
              <CalendarClock className="size-4" />
              Schedule Selected
            </Button>
          )}

          {publishableCount > 0 && (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={isProcessing}
              className="gap-1.5"
            >
              {publishing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Publishing {publishProgress.done}/{publishProgress.total}
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Publish Selected
                </>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClear}
            disabled={isProcessing}
            aria-label="Clear selection"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Schedule Date Picker Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule {schedulableCount} Post{schedulableCount !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Choose a publish date for the selected posts.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-4">
            <Calendar
              mode="single"
              selected={scheduledDate}
              onSelect={setScheduledDate}
              disabled={(date: Date) => date < new Date()}
            />
          </div>

          {scheduledDate && (
            <p className="text-center text-sm text-muted-foreground">
              Scheduling for {format(scheduledDate, "EEEE, MMMM d, yyyy")}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleOpen(false)}
              disabled={scheduling}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!scheduledDate || scheduling}
              className="gap-1.5"
            >
              {scheduling ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarClock className="size-4" />
                  Confirm Schedule
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
