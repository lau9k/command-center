"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { pipelineStageClass } from "@/lib/design-tokens";
import { DealCard, parseDealValue, formatCurrency } from "./DealCard";
import type { PipelineItemData } from "./DealCard";

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

      {/* Droppable area */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex min-h-[200px] flex-1 flex-col gap-2 rounded-lg border border-border p-2 transition-colors",
              stageStyles?.border,
              "border-l-2",
              stageStyles?.bg,
              snapshot.isDraggingOver && stageStyles?.bgDragOver
            )}
          >
            {items.map((item, index) => (
              <Draggable key={item.id} draggableId={item.id} index={index}>
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                  >
                    <DealCard
                      item={item}
                      onClick={onCardClick}
                      dragHandleProps={dragProvided.dragHandleProps}
                    />
                  </div>
                )}
              </Draggable>
            ))}
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
