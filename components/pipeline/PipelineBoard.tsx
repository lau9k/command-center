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
import { AddDealDialog } from "./AddDealDialog";
import { parseDealValue, formatCurrency } from "./DealCard";
import type { PipelineItemData } from "./DealCard";
import type { PipelineStage } from "./StageColumn";

interface PipelineBoardProps {
  stages?: PipelineStage[];
  items?: PipelineItemData[];
  projectId?: string;
}

interface DrawerForm {
  company: string;
  value: string;
  close_date: string;
  contact_name: string;
  probability: string;
  next_action: string;
  notes: string;
  stage_id: string;
}

function initDrawerForm(item: PipelineItemData): DrawerForm {
  const meta = item.metadata ?? {};
  return {
    company: String(meta.company ?? ""),
    value: meta.value ? String(meta.value) : "",
    close_date: String(meta.close_date ?? ""),
    contact_name: String(meta.contact_name ?? ""),
    probability: String(meta.probability ?? ""),
    next_action: String(meta.next_action ?? ""),
    notes: String(meta.notes ?? ""),
    stage_id: item.stage_id,
  };
}

function DrawerContent({
  item,
  stages,
  onDelete,
  onSave,
  onStageChange,
}: {
  item: PipelineItemData;
  stages: PipelineStage[];
  onDelete: (id: string) => void;
  onSave: (id: string, metadata: Record<string, unknown>, stageId: string) => Promise<void>;
  onStageChange: (itemId: string, newStageId: string, newIndex: number) => Promise<void>;
}) {
  const [form, setForm] = useState<DrawerForm>(() => initDrawerForm(item));
  const [saving, setSaving] = useState(false);

  // Re-initialize form when a different item is selected
  React.useEffect(() => {
    setForm(initDrawerForm(item));
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentStage = stages.find((s) => s.id === form.stage_id) ?? null;

  const hasChanges = React.useMemo(() => {
    const original = initDrawerForm(item);
    return (Object.keys(original) as (keyof DrawerForm)[]).some(
      (key) => form[key] !== original[key]
    );
  }, [form, item]);

  async function handleSave() {
    setSaving(true);
    try {
      const metadata: Record<string, unknown> = { ...item.metadata };
      metadata.company = form.company.trim() || undefined;
      const parsedValue = parseFloat(form.value.replace(/[$,\s]/g, ""));
      metadata.value = !isNaN(parsedValue) ? parsedValue : undefined;
      metadata.close_date = form.close_date.trim() || undefined;
      metadata.contact_name = form.contact_name.trim() || undefined;
      metadata.probability = form.probability.trim() || undefined;
      metadata.next_action = form.next_action.trim() || undefined;
      metadata.notes = form.notes.trim() || undefined;

      // Clean undefined keys
      for (const key of Object.keys(metadata)) {
        if (metadata[key] === undefined) delete metadata[key];
      }

      // Handle stage change via moveItem if stage changed
      if (form.stage_id !== item.stage_id) {
        await onStageChange(item.id, form.stage_id, 0);
      }

      await onSave(item.id, metadata, form.stage_id);
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof DrawerForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const fieldLabelClass = "mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground";
  const inputClass =
    "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="flex flex-col gap-5">
      {/* Stage Selector */}
      <div>
        <h4 className={fieldLabelClass}>Stage</h4>
        <div className="flex items-center gap-2">
          {currentStage && (
            <span
              className="inline-block size-3 shrink-0 rounded-full"
              style={{ backgroundColor: currentStage.color ?? "#6B7280" }}
            />
          )}
          <select
            value={form.stage_id}
            onChange={(e) => updateField("stage_id", e.target.value)}
            className={inputClass}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Deal Value */}
      <div>
        <h4 className={fieldLabelClass}>Deal Value</h4>
        <div className="flex items-center gap-1.5">
          <DollarSign className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={form.value}
            onChange={(e) => updateField("value", e.target.value)}
            placeholder="10000"
            className={inputClass}
          />
        </div>
      </div>

      {/* Company */}
      <div>
        <h4 className={fieldLabelClass}>Company</h4>
        <div className="flex items-center gap-1.5">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={form.company}
            onChange={(e) => updateField("company", e.target.value)}
            placeholder="Company name"
            className={inputClass}
          />
        </div>
      </div>

      {/* Contact */}
      <div>
        <h4 className={fieldLabelClass}>Contact</h4>
        <div className="flex items-center gap-1.5">
          <User className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={form.contact_name}
            onChange={(e) => updateField("contact_name", e.target.value)}
            placeholder="Contact name"
            className={inputClass}
          />
        </div>
      </div>

      {/* Close Date */}
      <div>
        <h4 className={fieldLabelClass}>Close Date</h4>
        <div className="flex items-center gap-1.5">
          <Calendar className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="date"
            value={form.close_date}
            onChange={(e) => updateField("close_date", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Probability */}
      <div>
        <h4 className={fieldLabelClass}>Probability</h4>
        <input
          type="text"
          value={form.probability}
          onChange={(e) => updateField("probability", e.target.value)}
          placeholder="e.g. 75%"
          className={inputClass}
        />
      </div>

      {/* Next Action */}
      <div>
        <h4 className={fieldLabelClass}>Next Action</h4>
        <input
          type="text"
          value={form.next_action}
          onChange={(e) => updateField("next_action", e.target.value)}
          placeholder="Next step..."
          className={inputClass}
        />
      </div>

      {/* Notes */}
      <div>
        <h4 className={fieldLabelClass}>Notes</h4>
        <div className="flex items-start gap-1.5">
          <FileText className="mt-2 size-4 shrink-0 text-muted-foreground" />
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Additional notes..."
            rows={3}
            className={inputClass + " resize-y"}
          />
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      )}

      <div className="border-t border-border pt-4">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>
            Created {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
          </span>
          <span>
            Updated {format(new Date(item.updated_at), "MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <button
          onClick={() => onDelete(item.id)}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" />
          Delete Deal
        </button>
      </div>
    </div>
  );
}

function MobileListView({
  stages,
  itemsByStage,
  onCardClick,
  onQuickAdd,
}: {
  stages: PipelineStage[];
  itemsByStage: Map<string, PipelineItemData[]>;
  onCardClick: (item: PipelineItemData) => void;
  onQuickAdd: (stageId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleStage = (stageId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3 md:hidden">
      {stages.map((stage) => {
        const stageItems = itemsByStage.get(stage.id) ?? [];
        const isCollapsed = collapsed.has(stage.id);

        return (
          <div key={stage.id} className="rounded-lg border border-border">
            {/* Stage header */}
            <button
              type="button"
              onClick={() => toggleStage(stage.id)}
              className="flex w-full items-center gap-2 px-3 py-2.5"
            >
              {isCollapsed ? (
                <ChevronRight className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: stage.color ?? "#6B7280" }}
              />
              <span className="text-sm font-semibold text-foreground">
                {stage.name}
              </span>
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
                {stageItems.length}
              </span>
            </button>

            {/* Stage items */}
            {!isCollapsed && (
              <div className="border-t border-border">
                {stageItems.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <p className="text-xs text-muted-foreground">
                      No deals in {stage.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => onQuickAdd(stage.id)}
                      className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      + Add deal
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {stageItems.map((item) => {
                      const meta = item.metadata ?? {};
                      const dealValue = parseDealValue(meta.value);
                      const contactName = String(meta.contact_name ?? "");

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onCardClick(item)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.title}
                            </p>
                            {contactName && (
                              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <User className="size-3 shrink-0" />
                                {contactName}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {dealValue > 0 && (
                              <span className="text-xs font-semibold text-foreground">
                                {formatCurrency(dealValue)}
                              </span>
                            )}
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: `${stage.color ?? "#6B7280"}20`,
                                color: stage.color ?? "#6B7280",
                              }}
                            >
                              {stage.name}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PipelineBoard({ stages: stagesProp, items: itemsProp, projectId }: PipelineBoardProps) {
  const { data: queryStages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["pipeline", "stages"],
    enabled: !stagesProp,
  });
  const { data: queryItems = [] } = useQuery<PipelineItemData[]>({
    queryKey: ["pipeline", "items"],
    enabled: !itemsProp,
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
          projectId={projectId ?? sortedStages[0].project_id ?? ""}
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
