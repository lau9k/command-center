"use client";

import { useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { CalendarClock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui";
import type { FilterDefinition, FilterValues } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { PostCard } from "./PostCard";
import { PostDetailDrawer } from "./PostDetailDrawer";
import type { ContentPost, ContentPostStatus } from "@/lib/types/database";

const COLUMNS: { id: ContentPostStatus; label: string; color: string }[] = [
  { id: "draft", label: "Draft", color: "#666666" },
  { id: "ready", label: "Ready", color: "#EAB308" },
  { id: "scheduled", label: "Scheduled", color: "#3B82F6" },
  { id: "published", label: "Published", color: "#22C55E" },
];

const PLATFORM_OPTIONS = [
  { label: "LinkedIn", value: "linkedin" },
  { label: "X", value: "twitter" },
  { label: "YouTube", value: "youtube" },
  { label: "Instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
];

const STATUS_OPTIONS = COLUMNS.map((c) => ({
  label: c.label,
  value: c.id,
}));

const FILTER_DEFS: FilterDefinition[] = [
  { id: "platform", label: "Platform", options: PLATFORM_OPTIONS },
  { id: "status", label: "Status", options: STATUS_OPTIONS },
];

interface ContentKanbanProps {
  initialPosts: ContentPost[];
}

export function ContentKanban({ initialPosts }: ContentKanbanProps) {
  const [posts, setPosts] = useState<ContentPost[]>(initialPosts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerPost, setDrawerPost] = useState<ContentPost | null>(null);
  const [filterValues, setFilterValues] = useState<FilterValues>({
    platform: [],
    status: [],
  });

  const filteredPosts = posts.filter((post) => {
    const platformFilter = filterValues.platform;
    const statusFilter = filterValues.status;

    if (platformFilter.length > 0 && !platformFilter.includes(post.platform ?? "")) {
      return false;
    }
    if (statusFilter.length > 0 && !statusFilter.includes(post.status)) {
      return false;
    }
    return true;
  });

  const columnPosts = (status: ContentPostStatus) =>
    filteredPosts.filter((p) => p.status === status);

  const updatePostStatus = useCallback(
    async (id: string, status: ContentPostStatus) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status, updated_at: new Date().toISOString() } : p
        )
      );

      try {
        const res = await fetch("/api/content-posts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        if (!res.ok) {
          // Revert on failure
          setPosts((prev) =>
            prev.map((p) => {
              const original = initialPosts.find((ip) => ip.id === p.id);
              return p.id === id && original ? original : p;
            })
          );
        }
      } catch {
        setPosts((prev) =>
          prev.map((p) => {
            const original = initialPosts.find((ip) => ip.id === p.id);
            return p.id === id && original ? original : p;
          })
        );
      }
    },
    [initialPosts]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const newStatus = result.destination.droppableId as ContentPostStatus;
      const postId = result.draggableId;

      const post = posts.find((p) => p.id === postId);
      if (!post || post.status === newStatus) return;

      updatePostStatus(postId, newStatus);
    },
    [posts, updatePostStatus]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleScheduleAll = useCallback(async () => {
    const toSchedule = Array.from(selectedIds).filter((id) => {
      const post = posts.find((p) => p.id === id);
      return post && (post.status === "draft" || post.status === "ready");
    });

    if (toSchedule.length === 0) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        toSchedule.includes(p.id)
          ? { ...p, status: "scheduled" as ContentPostStatus, updated_at: new Date().toISOString() }
          : p
      )
    );
    setSelectedIds(new Set());

    // Batch update
    await Promise.allSettled(
      toSchedule.map((id) =>
        fetch("/api/content-posts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: "scheduled" }),
        })
      )
    );
  }, [selectedIds, posts]);

  const schedulableCount = Array.from(selectedIds).filter((id) => {
    const post = posts.find((p) => p.id === id);
    return post && (post.status === "draft" || post.status === "ready");
  }).length;

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        title="No content posts yet"
        description="Create your first content post to start managing your content pipeline."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar: Filters + Bulk actions */}
      <div className="flex items-start justify-between gap-4">
        <FilterBar
          filters={FILTER_DEFS}
          values={filterValues}
          onChange={setFilterValues}
        />

        {selectedIds.size > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            {schedulableCount > 0 && (
              <Button size="sm" onClick={handleScheduleAll}>
                <CalendarClock className="mr-1.5 size-4" />
                Schedule {schedulableCount > 1 ? `all (${schedulableCount})` : ""}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-muted-foreground"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Kanban board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map((column) => {
            const items = columnPosts(column.id);

            return (
              <div key={column.id} className="flex flex-col">
                {/* Column header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <h3 className="text-sm font-semibold text-foreground">
                      {column.label}
                    </h3>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                </div>

                {/* Droppable column */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "flex min-h-[200px] flex-col gap-2 rounded-lg border border-border bg-background p-2 transition-colors",
                        snapshot.isDraggingOver && "border-[#3B82F6]/30 bg-[#3B82F6]/5"
                      )}
                    >
                      {items.map((post, index) => (
                        <Draggable
                          key={post.id}
                          draggableId={post.id}
                          index={index}
                        >
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                            >
                              <PostCard
                                post={post}
                                selected={selectedIds.has(post.id)}
                                onSelect={toggleSelect}
                                onClick={setDrawerPost}
                                dragHandleProps={dragProvided.dragHandleProps}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {items.length === 0 && (
                        <div className="flex flex-1 items-center justify-center py-8">
                          <p className="text-xs text-text-muted">
                            Drop posts here
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Post detail drawer */}
      <PostDetailDrawer
        post={drawerPost}
        onClose={() => setDrawerPost(null)}
        onStatusChange={(id, status) => {
          updatePostStatus(id, status);
          setDrawerPost(null);
        }}
      />
    </div>
  );
}
