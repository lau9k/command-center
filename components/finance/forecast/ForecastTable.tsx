"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, Power, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/ui";
import type { ColumnDef } from "@/components/ui";
import type { ScheduledFlow, FlowDirection, FlowCadence } from "./types";
import { formatCurrency } from "./types";

function buildFlowColumns(
  onToggle: (id: string, active: boolean) => void,
  onDelete: (id: string) => void
): ColumnDef<ScheduledFlow>[] {
  return [
    { id: "name", header: "Name", accessorKey: "name", sortable: true },
    {
      id: "amount", header: "Amount", accessorKey: "amount", sortable: true,
      cell: (row) => (
        <span className={cn("font-medium", row.direction === "inflow" ? "text-[#22C55E]" : "text-foreground")}>
          {row.direction === "inflow" ? "+" : "-"}{formatCurrency(Number(row.amount))}
        </span>
      ),
    },
    {
      id: "cadence", header: "Cadence", accessorKey: "cadence", sortable: true,
      cell: (row) => <span className="capitalize text-muted-foreground">{row.cadence.replace(/_/g, " ")}</span>,
    },
    {
      id: "due_day", header: "Due Day", accessorKey: "due_day", sortable: true,
      cell: (row) => <span className="text-muted-foreground">{row.due_day ? `Day ${row.due_day}` : "—"}</span>,
    },
    {
      id: "probability", header: "Prob.", accessorKey: "probability",
      cell: (row) => <span className="text-muted-foreground">{Math.round(Number(row.probability) * 100)}%</span>,
    },
    {
      id: "actions", header: "",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(row.id, !row.is_active); }}
            className={cn("rounded p-1 transition-colors", row.is_active ? "text-[#22C55E] hover:bg-[#22C55E]/10" : "text-text-muted hover:bg-accent")}
            title={row.is_active ? "Disable" : "Enable"}
          >
            <Power className="size-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(row.id); }}
            className="rounded p-1 text-text-muted transition-colors hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
            title="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ),
    },
  ];
}

interface ForecastTableProps {
  flows: ScheduledFlow[];
  activeCount: number;
  inactiveCount: number;
  loading: boolean;
  onToggleFlow: (id: string, active: boolean) => void;
  onDeleteFlow: (id: string) => void;
  onAddFlow: (flow: { name: string; amount: number; direction: FlowDirection; cadence: FlowCadence; due_day: number | null; category: string | null; probability: number }) => Promise<boolean>;
  onRecompute: () => void;
}

export function ForecastTable({
  flows,
  activeCount,
  inactiveCount,
  loading,
  onToggleFlow,
  onDeleteFlow,
  onAddFlow,
  onRecompute,
}: ForecastTableProps) {
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [newFlow, setNewFlow] = useState({
    name: "", amount: "", direction: "outflow" as FlowDirection,
    cadence: "monthly" as FlowCadence, due_day: "", category: "", probability: "1.0",
  });

  const flowColumns = useMemo(
    () => buildFlowColumns(onToggleFlow, onDeleteFlow),
    [onToggleFlow, onDeleteFlow]
  );

  const handleAddFlow = useCallback(async () => {
    if (!newFlow.name || !newFlow.amount) return;
    const ok = await onAddFlow({
      name: newFlow.name,
      amount: parseFloat(newFlow.amount),
      direction: newFlow.direction,
      cadence: newFlow.cadence,
      due_day: newFlow.due_day ? parseInt(newFlow.due_day) : null,
      category: newFlow.category || null,
      probability: parseFloat(newFlow.probability),
    });
    if (ok) {
      setNewFlow({ name: "", amount: "", direction: "outflow", cadence: "monthly", due_day: "", category: "", probability: "1.0" });
      setShowAddFlow(false);
    }
  }, [newFlow, onAddFlow]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Scheduled Flows
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {activeCount} active{inactiveCount > 0 && `, ${inactiveCount} inactive`}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onRecompute}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:opacity-50"
          >
            {loading ? "Computing..." : "Recompute"}
          </button>
          <button
            onClick={() => setShowAddFlow(!showAddFlow)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              showAddFlow
                ? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]"
                : "border-border bg-background text-muted-foreground hover:border-ring hover:text-foreground"
            )}
          >
            <Plus className="size-3.5" />
            Add Flow
          </button>
        </div>
      </div>

      {showAddFlow && (
        <div className="mb-4 rounded-lg border border-[#3B82F6]/30 bg-card p-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Name</label>
              <input type="text" value={newFlow.name} onChange={(e) => setNewFlow({ ...newFlow, name: e.target.value })}
                placeholder="Flow name" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Amount</label>
              <input type="number" value={newFlow.amount} onChange={(e) => setNewFlow({ ...newFlow, amount: e.target.value })}
                placeholder="0.00" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Direction</label>
              <select value={newFlow.direction} onChange={(e) => setNewFlow({ ...newFlow, direction: e.target.value as FlowDirection })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none">
                <option value="outflow">Outflow</option>
                <option value="inflow">Inflow</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Cadence</label>
              <select value={newFlow.cadence} onChange={(e) => setNewFlow({ ...newFlow, cadence: e.target.value as FlowCadence })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none">
                <option value="monthly">Monthly</option>
                <option value="biweekly">Biweekly</option>
                <option value="weekly">Weekly</option>
                <option value="one_time">One-time</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Due Day</label>
              <input type="number" min="1" max="28" value={newFlow.due_day}
                onChange={(e) => setNewFlow({ ...newFlow, due_day: e.target.value })}
                placeholder="1-28" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Category</label>
              <input type="text" value={newFlow.category} onChange={(e) => setNewFlow({ ...newFlow, category: e.target.value })}
                placeholder="e.g., housing" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Probability</label>
              <input type="number" step="0.05" min="0" max="1" value={newFlow.probability}
                onChange={(e) => setNewFlow({ ...newFlow, probability: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleAddFlow}
                className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563EB]">
                <Plus className="size-3.5" />
                Add
              </button>
              <button onClick={() => setShowAddFlow(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <DataTable columns={flowColumns} data={flows} rowKey={(row) => row.id} pageSize={15} />
    </div>
  );
}
