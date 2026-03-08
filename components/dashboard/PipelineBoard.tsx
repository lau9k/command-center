"use client";

import * as React from "react";
import { format } from "date-fns";
import { DollarSign, Building2, User, Calendar, FileText, ChevronRight } from "lucide-react";
import { KpiCard, Drawer } from "@/components/ui";

interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  color: string | null;
  pipeline_id: string;
}

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

interface PipelineBoardProps {
  stages: PipelineStage[];
  items: PipelineItemData[];
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

function DrawerContent({ item, stage }: { item: PipelineItemData; stage: PipelineStage | null }) {
  const meta = item.metadata ?? {};
  const dealValue = parseDealValue(meta.deal_value);
  const company = String(meta.company ?? "");
  const contactName = String(meta.contact_name ?? "");
  const closeDate = String(meta.close_date ?? "");
  const probability = String(meta.probability ?? "");
  const nextAction = String(meta.next_action ?? "");
  const notes = String(meta.notes ?? "");

  return (
    <div className="flex flex-col gap-5">
      {stage && (
        <div className="flex items-center gap-2">
          <span
            className="inline-block size-3 rounded-full"
            style={{ backgroundColor: stage.color ?? "#6B7280" }}
          />
          <span className="text-sm font-medium text-foreground">{stage.name}</span>
        </div>
      )}

      {dealValue > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Deal Value
          </h4>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <DollarSign className="size-4 text-muted-foreground" />
            {formatCurrency(dealValue)}
          </div>
        </div>
      )}

      {company && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Company
          </h4>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <Building2 className="size-4 text-muted-foreground" />
            {company}
          </div>
        </div>
      )}

      {contactName && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Contact
          </h4>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <User className="size-4 text-muted-foreground" />
            {contactName}
          </div>
        </div>
      )}

      {closeDate && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Close Date
          </h4>
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <Calendar className="size-4 text-muted-foreground" />
            {closeDate}
          </div>
        </div>
      )}

      {probability && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Probability
          </h4>
          <p className="text-sm text-foreground">{probability}</p>
        </div>
      )}

      {nextAction && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Next Action
          </h4>
          <p className="text-sm text-foreground">{nextAction}</p>
        </div>
      )}

      {notes && (
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Notes
          </h4>
          <div className="flex items-start gap-1.5 text-sm text-foreground">
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="whitespace-pre-wrap">{notes}</p>
          </div>
        </div>
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
    </div>
  );
}

export function PipelineBoard({ stages, items }: PipelineBoardProps) {
  const [selectedItem, setSelectedItem] = React.useState<PipelineItemData | null>(null);

  const stageMap = React.useMemo(() => {
    const map = new Map<string, PipelineStage>();
    for (const s of stages) map.set(s.id, s);
    return map;
  }, [stages]);

  const sortedStages = React.useMemo(
    () => [...stages].sort((a, b) => a.sort_order - b.sort_order),
    [stages]
  );

  const itemsByStage = React.useMemo(() => {
    const grouped = new Map<string, PipelineItemData[]>();
    for (const stage of sortedStages) {
      grouped.set(stage.id, []);
    }
    for (const item of items) {
      const list = grouped.get(item.stage_id);
      if (list) list.push(item);
    }
    return grouped;
  }, [items, sortedStages]);

  const totalValue = React.useMemo(
    () => items.reduce((sum, item) => sum + parseDealValue(item.metadata?.deal_value), 0),
    [items]
  );

  const openDealsCount = React.useMemo(
    () =>
      items.filter((item) => {
        const stage = stageMap.get(item.stage_id);
        return stage && !stage.slug.startsWith("closed");
      }).length,
    [items, stageMap]
  );

  const selectedStage = selectedItem ? stageMap.get(selectedItem.stage_id) : null;

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

      {/* Grouped Table View */}
      {sortedStages.map((stage) => {
        const stageItems = itemsByStage.get(stage.id) ?? [];
        const stageValue = stageItems.reduce(
          (sum, item) => sum + parseDealValue(item.metadata?.deal_value),
          0
        );

        return (
          <div key={stage.id} className="overflow-hidden rounded-lg border border-border">
            {/* Stage Header */}
            <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-full"
                  style={{ backgroundColor: stage.color ?? "#6B7280" }}
                />
                <span className="text-sm font-semibold text-foreground">
                  {stage.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({stageItems.length})
                </span>
              </div>
              {stageValue > 0 && (
                <span className="text-sm font-medium text-muted-foreground">
                  {formatCurrency(stageValue)}
                </span>
              )}
            </div>

            {/* Items */}
            {stageItems.length === 0 ? (
              <div className="bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                No deals in this stage
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Value
                    </th>
                    <th className="hidden px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                      Company
                    </th>
                    <th className="hidden px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                      Contact
                    </th>
                    <th className="hidden px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground lg:table-cell">
                      Last Updated
                    </th>
                    <th className="w-10 px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {stageItems.map((item) => {
                    const meta = item.metadata ?? {};
                    const value = parseDealValue(meta.deal_value);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="cursor-pointer border-b border-border bg-card transition-colors last:border-b-0 hover:bg-accent"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">
                          {item.title}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {value > 0 ? formatCurrency(value) : "—"}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                          {(meta.company as string) || "—"}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                          {(meta.contact_name as string) || "—"}
                        </td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {format(new Date(item.updated_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <ChevronRight className="size-4" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      {/* Detail Drawer */}
      <Drawer
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.title ?? "Deal Details"}
      >
        {selectedItem ? (
          <DrawerContent item={selectedItem} stage={selectedStage ?? null} />
        ) : (
          <div />
        )}
      </Drawer>
    </div>
  );
}
