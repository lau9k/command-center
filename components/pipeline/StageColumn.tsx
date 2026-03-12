"use client";

import { useRef } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { pipelineStageClass } from "@/lib/design-tokens";
import { DealCard, parseDealValue, formatCurrency } from "./DealCard";
import type { PipelineItemData } from "./DealCard";

const CARD_HEIGHT = 88;
const CARD_GAP = 8;

interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  color: string | null;
  pipeline_id: string;
  project_id?: string;
}

interface StageColumnProps {
  stage: PipelineStage;
  items: PipelineItemData[];
  onCardClick: (item: PipelineItemData) => void;
  onQuickAdd: (stageId: string) => void;
}

export function StageColumn({ stage, items, onCardClick, onQuickAdd }: StageColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    overscan: 5,
  });

  const totalValue = items.reduce(
    (sum, item) => sum + parseDealValue(item.metadata?.deal_value),
    0
  );

  const stageStyles = pipelineStageClass[stage.slug] ?? pipelineStageClass["lead"];

  return (
    <div className="flex min-w-[280px] flex-col">
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="size-2.5 rounded-full"
            style={{ backgroundColor: stage.color ?? "#6B7280" }}
          />
          <h3 className="text-sm font-semibold text-foreground">
            {stage.name}
          </h3>
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {totalValue > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {formatCurrency(totalValue)}
            </span>
          )}
          <button
            onClick={() => onQuickAdd(stage.id)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={`Add deal to ${stage.name}`}
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {/* Droppable area with virtualization */}
      <Droppable
        droppableId={stage.id}
        mode="virtual"
        renderClone={(provided, snapshot, rubric) => {
          const item = items[rubric.source.index];
          return (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
            >
              <DealCard
                item={item}
                onClick={onCardClick}
                dragHandleProps={null}
              />
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
            className={cn(
              "min-h-[200px] flex-1 overflow-y-auto rounded-lg border border-border p-2 transition-colors",
              stageStyles?.border,
              "border-l-2",
              stageStyles?.bg,
              snapshot.isDraggingOver && stageStyles?.bgDragOver
            )}
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
                const item = items[virtualRow.index];
                return (
                  <Draggable
                    key={item.id}
                    draggableId={item.id}
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
                        <DealCard
                          item={item}
                          onClick={onCardClick}
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
                  Drop deals here
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export type { PipelineStage };
