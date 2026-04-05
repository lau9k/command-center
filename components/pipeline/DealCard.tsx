"use client";

import { format } from "date-fns";
import { DollarSign, Building2, User, GripVertical, Calendar } from "lucide-react";
import type { DraggableProvidedDragHandleProps } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import { pipelineQualifiedBadgeClass } from "@/lib/design-tokens";

interface PipelineItemData {
  id: string;
  pipeline_id: string;
  stage_id: string;
  project_id: string;
  title: string;
  entity_type: string | null;
  metadata: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface DealCardProps {
  item: PipelineItemData;
  onClick: (item: PipelineItemData) => void;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
}

function parseDealValue(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[$,\s]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

export function DealCard({ item, onClick, dragHandleProps }: DealCardProps) {
  const meta = item.metadata ?? {};
  const dealValue = parseDealValue(meta.value);
  const company = String(meta.company ?? "");
  const contactName = String(meta.contact_name ?? "");
  const qualifiedStatus = String(meta.qualified_status ?? "");

  return (
    <div
      onClick={() => onClick(item)}
      className="group cursor-pointer rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50"
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="mt-0.5 shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        >
          <GripVertical className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Title */}
          <h4 className="truncate text-sm font-medium text-foreground">
            {item.title}
          </h4>

          {/* Company + Contact */}
          <div className="mt-1.5 flex flex-col gap-1">
            {company && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="size-3 shrink-0" />
                <span className="truncate">{company}</span>
              </div>
            )}
            {contactName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="size-3 shrink-0" />
                <span className="truncate">{contactName}</span>
              </div>
            )}
          </div>

          {/* Bottom row: Value + Badge + Date */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {dealValue > 0 && (
                <span className="flex items-center gap-0.5 text-xs font-semibold text-foreground">
                  <DollarSign className="size-3" />
                  {formatCurrency(dealValue).replace("$", "")}
                </span>
              )}
              {qualifiedStatus && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize",
                    pipelineQualifiedBadgeClass[qualifiedStatus] ?? "bg-muted text-muted-foreground"
                  )}
                >
                  {qualifiedStatus}
                </span>
              )}
            </div>
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Calendar className="size-2.5" />
              {format(new Date(item.updated_at), "MMM d")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { parseDealValue, formatCurrency };
export type { PipelineItemData };
