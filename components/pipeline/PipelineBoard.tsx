"use client";

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import {
  DragDropContext,
  type DropResult,
} from "@hello-pangea/dnd";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  DollarSign,
  Building2,
  User,
  Calendar,
  FileText,
  Trash2,
  Plus,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { KpiCard, Drawer } from "@/components/ui";
import { SharedEmptyState } from "@/components/shared/EmptyState";
import { EmptyState } from "@/components/ui/empty-state";
import { StageColumn } from "./StageColumn";
import { DealDrawerView } from "./DealDrawerView";
import { AddDealDialog } from "./AddDealDialog";
import { parseDealValue, formatCurrency } from "./DealCard";
import type { PipelineItemData } from "./DealCard";
import type { PipelineStage } from "./StageColumn";

interface PipelineBoardProps {
  stages?: PipelineStage[];
  items?: PipelineItemData[];
  projectId?: string;
}

function DrawerContent(props: {
  item: PipelineItemData;
  stages: PipelineStage[];
  onDelete: (id: string) => void;
  onSave: (id: string, metadata: Record<string, unknown>, stageId: string) => Promise<void>;
  onStageChange: (itemId: string, newStageId: string, newIndex: number) => Promise<void>;
}) {
  return <DealDrawerView {...props} />;
}

export function PipelineBoard({ stages: stagesProp, items: itemsProp, projectId }: PipelineBoardProps) {
  const { data: queryStages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["pipeline", "stages", projectId ?? "global"],
    enabled: !stagesProp,
  });
  const { data: queryItems = [] } = useQuery<PipelineItemData[]>({
    queryKey: ["pipeline", "items", projectId ?? "global"],
    enabled: !itemsProp,
  });

  // In global view, fetch projects list for deal creation
  const { data: projects = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["projects", "list"],
    enabled: !projectId,
  });

  const stages = stagesProp ?? queryStages;
  const resolvedItems = itemsProp ?? queryItems;
  const [items, setItems] = useState<PipelineItemData[]>(resolvedItems);

  // Sync local state when resolved data changes (e.g. on refetch)
  React.useEffect(() => {
    setItems(resolvedItems);
  }, [resolvedItems]);
  const [selectedItem, setSelectedItem] = useState<PipelineItemData | null>(null);
  const [quickAddStageId, setQuickAddStageId] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState(false);

  const stageMap = useMemo(() => {
    const map = new Map<string, PipelineStage>();
    for (const s of stages) map.set(s.id, s);
    return map;
  }, [stages]);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.sort_order - b.sort_order),
    [stages]
  );

  const itemsByStage = useMemo(() => {
    const grouped = new Map<string, PipelineItemData[]>();
    for (const stage of sortedStages) {
      grouped.set(stage.id, []);
    }
    for (const item of items) {
      const list = grouped.get(item.stage_id);
      if (list) list.push(item);
    }
    // Sort items within each stage
    for (const [, stageItems] of grouped) {
      stageItems.sort((a, b) => a.sort_order - b.sort_order);
    }
    return grouped;
  }, [items, sortedStages]);

  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + parseDealValue(item.metadata?.value), 0),
    [items]
  );

  const openDealsCount = useMemo(
    () =>
      items.filter((item) => {
        const stage = stageMap.get(item.stage_id);
        return stage && !stage.slug.startsWith("closed");
      }).length,
    [items, stageMap]
  );

  const moveItem = useCallback(
    async (itemId: string, newStageId: string, newIndex: number) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const oldStageId = item.stage_id;

      // Optimistic update
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, stage_id: newStageId, sort_order: newIndex, updated_at: new Date().toISOString() }
            : i
        )
      );

      try {
        const res = await fetch("/api/pipeline", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: itemId, stage_id: newStageId, sort_order: newIndex }),
        });
        if (!res.ok) {
          // Revert on failure
          setItems((prev) =>
            prev.map((i) =>
              i.id === itemId ? { ...i, stage_id: oldStageId, sort_order: item.sort_order } : i
            )
          );
        }
      } catch {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, stage_id: oldStageId, sort_order: item.sort_order } : i
          )
        );
      }
    },
    [items]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;

      const itemId = result.draggableId;
      const newStageId = result.destination.droppableId;
      const newIndex = result.destination.index;

      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      // Skip if dropped in same position
      if (item.stage_id === newStageId && item.sort_order === newIndex) return;

      moveItem(itemId, newStageId, newIndex);
    },
    [items, moveItem]
  );

  const handleQuickAdd = useCallback((stageId: string) => {
    setQuickAddStageId(stageId);
    setQuickAddTitle("");
  }, []);

  const submitQuickAdd = useCallback(async () => {
    if (!quickAddStageId || !quickAddTitle.trim()) return;

    const stage = stageMap.get(quickAddStageId);
    if (!stage) return;

    setIsCreating(true);
    try {
      const stageItems = itemsByStage.get(quickAddStageId) ?? [];
      const maxSort = stageItems.length > 0
        ? Math.max(...stageItems.map((i) => i.sort_order))
        : -1;

      const resolvedProjectId = projectId ?? stage.project_id;
      if (!resolvedProjectId) return;

      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickAddTitle.trim(),
          pipeline_id: stage.pipeline_id,
          stage_id: quickAddStageId,
          project_id: resolvedProjectId,
          sort_order: maxSort + 1,
          metadata: {},
        }),
      });

      if (res.ok) {
        const newItem = await res.json();
        setItems((prev) => [...prev, newItem]);
        setQuickAddStageId(null);
        setQuickAddTitle("");
      }
    } finally {
      setIsCreating(false);
    }
  }, [quickAddStageId, quickAddTitle, stageMap, itemsByStage, projectId]);

  const cancelQuickAdd = useCallback(() => {
    setQuickAddStageId(null);
    setQuickAddTitle("");
  }, []);

  const handleSaveItem = useCallback(
    async (id: string, metadata: Record<string, unknown>, stageId: string) => {
      const prev = items;

      // Optimistic update
      setItems((current) =>
        current.map((i) =>
          i.id === id
            ? { ...i, metadata, stage_id: stageId, updated_at: new Date().toISOString() }
            : i
        )
      );
      setSelectedItem((sel) =>
        sel?.id === id
          ? { ...sel, metadata, stage_id: stageId, updated_at: new Date().toISOString() }
          : sel
      );

      try {
        const res = await fetch("/api/pipeline", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, metadata }),
        });
        if (!res.ok) {
          setItems(prev);
        }
      } catch {
        setItems(prev);
      }
    },
    [items]
  );

  const handleDelete = useCallback(async (id: string) => {
    const prev = items;
    setItems((current) => current.filter((i) => i.id !== id));
    setSelectedItem(null);

    try {
      const res = await fetch(`/api/pipeline/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setItems(prev);
      }
    } catch {
      setItems(prev);
    }
  }, [items]);

  if (sortedStages.length === 0 && items.length === 0) {
    return (
      <SharedEmptyState
        icon={<DollarSign className="size-12" />}
        title="No deals in pipeline"
        description="Add your first deal to track sales progress."
        action={{ label: "+ Add Deal", onClick: () => setShowAddDeal(true) }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Pipeline Value"
          value={formatCurrency(totalValue)}
          icon={<DollarSign className="size-4" />}
        />
        <KpiCard label="Total Deals" value={items.length} />
        <KpiCard label="Open Deals" value={openDealsCount} />
      </div>

      {/* Add Deal Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddDeal(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Add Deal
        </button>
      </div>

      {/* Add Deal Dialog */}
      {sortedStages.length > 0 && (
        <AddDealDialog
          open={showAddDeal}
          onOpenChange={setShowAddDeal}
          stages={sortedStages}
          pipelineId={sortedStages[0].pipeline_id}
          projectId={projectId}
          projects={projects}
          onDealCreated={(newItem) => setItems((prev) => [...prev, newItem])}
        />
      )}

      {/* Kanban Board (desktop) */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="hidden gap-4 overflow-x-auto pb-4 md:flex">
          {sortedStages.map((stage) => (
            <div key={stage.id} className="flex shrink-0 flex-col" style={{ width: 300 }}>
              <StageColumn
                stage={stage}
                items={itemsByStage.get(stage.id) ?? []}
                onCardClick={setSelectedItem}
                onQuickAdd={handleQuickAdd}
              />

              {/* Quick-add inline form */}
              {quickAddStageId === stage.id && (
                <div className="mt-2 rounded-lg border border-border bg-card p-2">
                  <input
                    type="text"
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitQuickAdd();
                      if (e.key === "Escape") cancelQuickAdd();
                    }}
                    placeholder="Deal name..."
                    autoFocus
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={submitQuickAdd}
                      disabled={isCreating || !quickAddTitle.trim()}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isCreating ? "Adding..." : "Add"}
                    </button>
                    <button
                      onClick={cancelQuickAdd}
                      className="rounded-md px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Mobile List View */}
      <MobileListView
        stages={sortedStages}
        itemsByStage={itemsByStage}
        onCardClick={setSelectedItem}
        onQuickAdd={handleQuickAdd}
      />

      {/* Detail Drawer */}
      <Drawer
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title ?? "Deal Details"}
      >
        {selectedItem ? (
          <DrawerContent
            item={selectedItem}
            stages={sortedStages}
            onDelete={handleDelete}
            onSave={handleSaveItem}
            onStageChange={moveItem}
          />
        ) : (
          <div />
        )}
      </Drawer>
    </div>
  );
}
