"use client";

import { useRef } from "react";
import Link from "next/link";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import type { Sponsor, SponsorStatus, SponsorTier } from "@/lib/types/database";

const CARD_HEIGHT = 88;
const CARD_GAP = 8;

const TIER_CONFIG: Record<SponsorTier, { label: string; className: string }> = {
  bronze: { label: "Bronze", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  silver: { label: "Silver", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300" },
  gold: { label: "Gold", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  platinum: { label: "Platinum", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  title: { label: "Title", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

function TierBadge({ tier }: { tier: SponsorTier }) {
  const config = TIER_CONFIG[tier];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

interface ColumnConfig {
  id: SponsorStatus;
  label: string;
  color: string;
}

interface SponsorColumnProps {
  column: ColumnConfig;
  items: Sponsor[];
  onQuickAdd: (status: SponsorStatus) => void;
  onDelete: (id: string) => void;
  quickAddSlot?: React.ReactNode;
}

export function SponsorColumn({ column, items, onQuickAdd, onDelete, quickAddSlot }: SponsorColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    overscan: 5,
  });

  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      {/* Column Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-full" style={{ backgroundColor: column.color }} />
          <h3 className="text-sm font-semibold text-foreground">{column.label}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {items.length}
          </span>
        </div>
        <button
          onClick={() => onQuickAdd(column.id)}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* Quick Add Slot */}
      {quickAddSlot}

      {/* Droppable area with virtualization */}
      <Droppable
        droppableId={column.id}
        mode="virtual"
        renderClone={(provided, _snapshot, rubric) => {
          const sponsor = items[rubric.source.index];
          return (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
            >
              <SponsorCard sponsor={sponsor} onDelete={onDelete} dragHandleProps={null} />
            </div>
          );
        }}
      >
        {(provided, snapshot) => (
          <div
            ref={(node) => {
              provided.innerRef(node);
              (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }}
            {...provided.droppableProps}
            className={`flex min-h-[120px] flex-1 flex-col rounded-lg border border-border/50 bg-muted/30 p-2 transition-colors overflow-y-auto ${
              snapshot.isDraggingOver ? "border-primary/50 bg-primary/5" : ""
            }`}
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const sponsor = items[virtualRow.index];
                return (
                  <Draggable
                    key={sponsor.id}
                    draggableId={sponsor.id}
                    index={virtualRow.index}
                  >
                    {(dragProvided) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        style={{
                          ...dragProvided.draggableProps.style,
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <SponsorCard
                          sponsor={sponsor}
                          onDelete={onDelete}
                          dragHandleProps={dragProvided.dragHandleProps}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
            </div>
            {provided.placeholder}

            {items.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-1 items-center justify-center rounded-md border-2 border-dashed border-border py-8">
                <p className="text-xs text-muted-foreground">
                  Drop sponsors here
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function SponsorCard({
  sponsor,
  onDelete,
  dragHandleProps,
}: {
  sponsor: Sponsor;
  onDelete: (id: string) => void;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
}) {
  return (
    <div className="group rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-2">
        <div
          {...dragHandleProps}
          className="mt-0.5 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        >
          <GripVertical className="size-4" />
        </div>
        <Link href={`/sponsors/${sponsor.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{sponsor.name}</p>
            <TierBadge tier={sponsor.tier} />
          </div>
          {sponsor.contact_name && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{sponsor.contact_name}</p>
          )}
          {Number(sponsor.amount) > 0 && (
            <p className="mt-1 text-xs font-medium text-foreground">
              {formatCurrency(Number(sponsor.amount))}
            </p>
          )}
        </Link>
        <button
          onClick={() => onDelete(sponsor.id)}
          className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export type { ColumnConfig };
