"use client";

import { useState, useCallback } from "react";
import { X, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ForecastResult, ForecastRun, ForecastTransform, WhatIfForm, WhatIfType } from "./types";
import { INITIAL_WHATIF } from "./types";

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none";
const inputPlaceholderCls = `${inputCls} placeholder:text-muted-foreground`;

interface ScenarioControlsProps {
  runs: ForecastRun[];
  results: ForecastResult[];
  selectedScenario: string;
  compareScenario: string;
  activeResult: ForecastResult | undefined;
  outflowNames: string[];
  onSelectScenario: (id: string) => void;
  onCompareScenario: (id: string) => void;
  onComputeAll: () => Promise<void>;
}

export function ScenarioControls({
  runs, results, selectedScenario, compareScenario, activeResult, outflowNames,
  onSelectScenario, onCompareScenario, onComputeAll,
}: ScenarioControlsProps) {
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [whatIf, setWhatIf] = useState<WhatIfForm>(INITIAL_WHATIF);

  const handleWhatIfPreview = useCallback(async () => {
    const transforms: ForecastTransform[] = [];
    switch (whatIf.type) {
      case "delay_payment":
        if (whatIf.flowName) transforms.push({ type: "delay_flow", flow_name: whatIf.flowName, delay_days: whatIf.delayDays });
        break;
      case "cut_expense":
        if (whatIf.flowName) transforms.push({ type: "scale_flow", flow_name: whatIf.flowName, factor: whatIf.factor });
        break;
      case "add_income":
        if (whatIf.name && whatIf.amount && whatIf.date)
          transforms.push({ type: "add_one_time", name: whatIf.name, amount: whatIf.amount, direction: "inflow", date: whatIf.date });
        break;
      case "add_recurring": break;
    }
    if (transforms.length === 0) return;
    const createRes = await fetch("/api/finance/forecast-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `What-if: ${whatIf.type.replace(/_/g, " ")}`, description: "Generated from what-if panel",
        horizon_days: 90, starting_cash: activeResult?.timeSeries[0]?.base ?? 2847.32, transforms, is_preset: false,
      }),
    });
    if (createRes.ok) { await onComputeAll(); setShowWhatIf(false); }
  }, [whatIf, activeResult, onComputeAll]);

  const tabCls = "rounded-md px-4 py-2 text-sm font-medium transition-colors";

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
          {runs.map((run) => (
            <button key={run.id} onClick={() => onSelectScenario(run.id)}
              className={cn(tabCls, selectedScenario === run.id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {run.name}
            </button>
          ))}
          {results.filter((r) => !runs.find((run) => run.id === r.runId)).map((r) => (
            <button key={r.runId} onClick={() => onSelectScenario(r.runId)}
              className={cn(tabCls, selectedScenario === r.runId ? "bg-[#A855F7]/20 text-[#A855F7]" : "text-text-muted hover:text-[#A855F7]")}>
              {r.runName}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={compareScenario} onChange={(e) => onCompareScenario(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted-foreground outline-none">
            <option value="">Compare with...</option>
            {results.filter((r) => r.runId !== selectedScenario).map((r) => (
              <option key={r.runId} value={r.runId}>{r.runName}</option>
            ))}
          </select>
          <button onClick={() => setShowWhatIf(!showWhatIf)}
            className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              showWhatIf ? "border-[#A855F7] bg-[#A855F7]/10 text-[#A855F7]" : "border-border bg-background text-muted-foreground hover:border-ring hover:text-foreground")}>
            What-if
          </button>
        </div>
      </div>

      {showWhatIf && (
        <div className="rounded-lg border border-[#A855F7]/30 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">What-if Analysis</h3>
            <button onClick={() => setShowWhatIf(false)} className="text-text-muted hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Action</label>
              <select value={whatIf.type} onChange={(e) => setWhatIf({ ...whatIf, type: e.target.value as WhatIfType })} className={inputCls}>
                <option value="delay_payment">Delay Payment</option>
                <option value="cut_expense">Cut Expense</option>
                <option value="add_income">Add Income</option>
                <option value="add_recurring">New Recurring</option>
              </select>
            </div>
            {(whatIf.type === "delay_payment" || whatIf.type === "cut_expense") && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Flow</label>
                <select value={whatIf.flowName} onChange={(e) => setWhatIf({ ...whatIf, flowName: e.target.value })} className={inputCls}>
                  <option value="">Select flow...</option>
                  {outflowNames.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            )}
            {whatIf.type === "delay_payment" && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Delay (days)</label>
                <input type="number" value={whatIf.delayDays}
                  onChange={(e) => setWhatIf({ ...whatIf, delayDays: parseInt(e.target.value) || 0 })} className={inputCls} />
              </div>
            )}
            {whatIf.type === "cut_expense" && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Keep % (e.g., 0.8 = 80%)</label>
                <input type="number" step="0.05" min="0" max="1" value={whatIf.factor}
                  onChange={(e) => setWhatIf({ ...whatIf, factor: parseFloat(e.target.value) || 0 })} className={inputCls} />
              </div>
            )}
            {whatIf.type === "add_income" && (
              <>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                  <input type="text" value={whatIf.name} onChange={(e) => setWhatIf({ ...whatIf, name: e.target.value })}
                    placeholder="e.g., Side project payment" className={inputPlaceholderCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Amount</label>
                  <input type="number" value={whatIf.amount || ""}
                    onChange={(e) => setWhatIf({ ...whatIf, amount: parseFloat(e.target.value) || 0 })} className={inputCls} />
                </div>
              </>
            )}
            {(whatIf.type === "add_income" || whatIf.type === "add_recurring") && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Date</label>
                <input type="date" value={whatIf.date} onChange={(e) => setWhatIf({ ...whatIf, date: e.target.value })} className={inputCls} />
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={handleWhatIfPreview}
              className="flex items-center gap-2 rounded-lg bg-[#A855F7] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#9333EA]">
              <Save className="size-3.5" /> Save as Scenario
            </button>
            <button onClick={() => { setWhatIf(INITIAL_WHATIF); setShowWhatIf(false); }}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
