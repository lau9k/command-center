"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
  Power,
  Save,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/ui";
import { DataTable } from "@/components/ui";
import type { ColumnDef } from "@/components/ui";
import type {
  ScheduledFlow,
  ForecastRun,
  ForecastResult,
  ForecastDayPoint,
  ForecastTransform,
  FlowDirection,
  FlowCadence,
} from "@/lib/types/database";

// Dynamic import for Recharts
const RechartsArea = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        AreaChart,
        Area,
        XAxis,
        YAxis,
        Tooltip,
        ResponsiveContainer,
        ReferenceLine,
        CartesianGrid,
        Legend,
      } = mod;
      return {
        default: function ForecastChart({
          data,
          overlayData,
          overlayName,
        }: {
          data: ForecastDayPoint[];
          overlayData?: ForecastDayPoint[];
          overlayName?: string;
        }) {
          return (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2A2A2A"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#666666", fontSize: 11 }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v + "T00:00:00");
                    return d.toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={13}
                />
                <YAxis
                  tick={{ fill: "#666666", fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    `$${(v / 1000).toFixed(1)}k`
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-xs shadow-lg">
                        <p className="mb-1 text-[#A0A0A0]">
                          {new Date(label + "T00:00:00").toLocaleDateString(
                            "en-CA",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {payload.map((p: any, i: number) => (
                            <p
                              key={i}
                              style={{ color: p.color }}
                              className="font-medium"
                            >
                              {String(p.name ?? "")}:{" "}
                              {new Intl.NumberFormat("en-CA", {
                                style: "currency",
                                currency: "CAD",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(Number(p.value ?? 0))}
                            </p>
                          )
                        )}
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#A0A0A0" }}
                />
                {/* Uncertainty band */}
                <Area
                  type="monotone"
                  dataKey="worst"
                  stackId="band"
                  stroke="none"
                  fill="transparent"
                  name="Worst Case"
                />
                <Area
                  type="monotone"
                  dataKey="best"
                  stroke="none"
                  fill="#3B82F6"
                  fillOpacity={0.08}
                  name="Best Case"
                />
                {/* Base line */}
                <Area
                  type="monotone"
                  dataKey="base"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="#3B82F6"
                  fillOpacity={0.15}
                  name="Base"
                />
                {/* Zero line */}
                <ReferenceLine
                  y={0}
                  stroke="#EF4444"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: "$0",
                    position: "right",
                    fill: "#EF4444",
                    fontSize: 11,
                  }}
                />
                {/* April 1 marker */}
                <ReferenceLine
                  x="2026-04-01"
                  stroke="#EAB308"
                  strokeDasharray="4 4"
                  label={{
                    value: "Apr 1",
                    position: "top",
                    fill: "#EAB308",
                    fontSize: 11,
                  }}
                />
                {/* Overlay scenario */}
                {overlayData && (
                  <Area
                    type="monotone"
                    data={overlayData}
                    dataKey="base"
                    stroke="#A855F7"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    fill="none"
                    name={overlayName ?? "Comparison"}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          );
        },
      };
    }),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return (
    <div className="flex h-[400px] items-center justify-center text-sm text-[#666666]">
      Loading chart...
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// --- Flow table columns ---
function buildFlowColumns(
  onToggle: (id: string, active: boolean) => void,
  onDelete: (id: string) => void
): ColumnDef<ScheduledFlow>[] {
  return [
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      sortable: true,
    },
    {
      id: "amount",
      header: "Amount",
      accessorKey: "amount",
      sortable: true,
      cell: (row) => (
        <span
          className={cn(
            "font-medium",
            row.direction === "inflow" ? "text-[#22C55E]" : "text-[#FAFAFA]"
          )}
        >
          {row.direction === "inflow" ? "+" : "-"}
          {formatCurrency(Number(row.amount))}
        </span>
      ),
    },
    {
      id: "cadence",
      header: "Cadence",
      accessorKey: "cadence",
      sortable: true,
      cell: (row) => (
        <span className="capitalize text-[#A0A0A0]">
          {row.cadence.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      id: "due_day",
      header: "Due Day",
      accessorKey: "due_day",
      sortable: true,
      cell: (row) => (
        <span className="text-[#A0A0A0]">
          {row.due_day ? `Day ${row.due_day}` : "—"}
        </span>
      ),
    },
    {
      id: "probability",
      header: "Prob.",
      accessorKey: "probability",
      cell: (row) => (
        <span className="text-[#A0A0A0]">
          {Math.round(Number(row.probability) * 100)}%
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(row.id, !row.is_active);
            }}
            className={cn(
              "rounded p-1 transition-colors",
              row.is_active
                ? "text-[#22C55E] hover:bg-[#22C55E]/10"
                : "text-[#666666] hover:bg-[#666666]/10"
            )}
            title={row.is_active ? "Disable" : "Enable"}
          >
            <Power className="size-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row.id);
            }}
            className="rounded p-1 text-[#666666] transition-colors hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
            title="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ),
    },
  ];
}

// --- What-if types ---
type WhatIfType = "delay_payment" | "cut_expense" | "add_income" | "add_recurring";

interface WhatIfForm {
  type: WhatIfType;
  flowName: string;
  delayDays: number;
  factor: number;
  amount: number;
  name: string;
  direction: FlowDirection;
  cadence: FlowCadence;
  date: string;
}

const INITIAL_WHATIF: WhatIfForm = {
  type: "delay_payment",
  flowName: "",
  delayDays: 7,
  factor: 0.8,
  amount: 0,
  name: "",
  direction: "inflow",
  cadence: "monthly",
  date: "",
};

// --- Props ---
interface ForecastDashboardProps {
  scheduledFlows: ScheduledFlow[];
  forecastRuns: ForecastRun[];
}

export function ForecastDashboard({
  scheduledFlows: initialFlows,
  forecastRuns: initialRuns,
}: ForecastDashboardProps) {
  const [flows, setFlows] = useState(initialFlows);
  const [runs] = useState(initialRuns);
  const [results, setResults] = useState<ForecastResult[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>("");
  const [compareScenario, setCompareScenario] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [whatIf, setWhatIf] = useState<WhatIfForm>(INITIAL_WHATIF);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [newFlow, setNewFlow] = useState({
    name: "",
    amount: "",
    direction: "outflow" as FlowDirection,
    cadence: "monthly" as FlowCadence,
    due_day: "",
    category: "",
    probability: "1.0",
  });

  // Compute forecasts on mount
  const computeAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/forecast/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data: ForecastResult[] = await res.json();
        setResults(data);
        if (!selectedScenario && data.length > 0) {
          setSelectedScenario(data[0].runId);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedScenario]);

  useEffect(() => {
    computeAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Current scenario data
  const activeResult = useMemo(
    () => results.find((r) => r.runId === selectedScenario),
    [results, selectedScenario]
  );

  const compareResult = useMemo(
    () => (compareScenario ? results.find((r) => r.runId === compareScenario) : undefined),
    [results, compareScenario]
  );

  // --- Flow management ---
  const handleToggleFlow = useCallback(
    async (id: string, active: boolean) => {
      await fetch("/api/finance/scheduled-flows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: active }),
      });
      setFlows((prev) =>
        prev.map((f) => (f.id === id ? { ...f, is_active: active } : f))
      );
    },
    []
  );

  const handleDeleteFlow = useCallback(async (id: string) => {
    await fetch(`/api/finance/scheduled-flows?id=${id}`, { method: "DELETE" });
    setFlows((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleAddFlow = useCallback(async () => {
    if (!newFlow.name || !newFlow.amount) return;
    const res = await fetch("/api/finance/scheduled-flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newFlow.name,
        amount: parseFloat(newFlow.amount),
        direction: newFlow.direction,
        cadence: newFlow.cadence,
        due_day: newFlow.due_day ? parseInt(newFlow.due_day) : null,
        category: newFlow.category || null,
        probability: parseFloat(newFlow.probability),
      }),
    });
    if (res.ok) {
      const created: ScheduledFlow = await res.json();
      setFlows((prev) => [...prev, created]);
      setNewFlow({
        name: "",
        amount: "",
        direction: "outflow",
        cadence: "monthly",
        due_day: "",
        category: "",
        probability: "1.0",
      });
      setShowAddFlow(false);
    }
  }, [newFlow]);

  // --- What-if preview ---
  const handleWhatIfPreview = useCallback(async () => {
    const transforms: ForecastTransform[] = [];

    switch (whatIf.type) {
      case "delay_payment":
        if (whatIf.flowName) {
          transforms.push({
            type: "delay_flow",
            flow_name: whatIf.flowName,
            delay_days: whatIf.delayDays,
          });
        }
        break;
      case "cut_expense":
        if (whatIf.flowName) {
          transforms.push({
            type: "scale_flow",
            flow_name: whatIf.flowName,
            factor: whatIf.factor,
          });
        }
        break;
      case "add_income":
        if (whatIf.name && whatIf.amount && whatIf.date) {
          transforms.push({
            type: "add_one_time",
            name: whatIf.name,
            amount: whatIf.amount,
            direction: "inflow",
            date: whatIf.date,
          });
        }
        break;
      case "add_recurring":
        // For preview, we'd need to save a temp scenario
        break;
    }

    if (transforms.length === 0) return;

    // Save as a temp scenario and compute
    const createRes = await fetch("/api/finance/forecast-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `What-if: ${whatIf.type.replace(/_/g, " ")}`,
        description: "Generated from what-if panel",
        horizon_days: 90,
        starting_cash: activeResult?.timeSeries[0]?.base ?? 2847.32,
        transforms,
        is_preset: false,
      }),
    });

    if (createRes.ok) {
      await computeAll();
      setShowWhatIf(false);
    }
  }, [whatIf, activeResult, computeAll]);

  const flowColumns = useMemo(
    () => buildFlowColumns(handleToggleFlow, handleDeleteFlow),
    [handleToggleFlow, handleDeleteFlow]
  );

  const activeFlows = useMemo(
    () => flows.filter((f) => f.is_active),
    [flows]
  );

  const inactiveFlows = useMemo(
    () => flows.filter((f) => !f.is_active),
    [flows]
  );

  const outflowNames = useMemo(
    () => flows.filter((f) => f.direction === "outflow").map((f) => f.name),
    [flows]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Scenario Selector */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-1">
          {runs.map((run) => (
            <button
              key={run.id}
              onClick={() => setSelectedScenario(run.id)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                selectedScenario === run.id
                  ? "bg-[#1E1E1E] text-[#FAFAFA]"
                  : "text-[#A0A0A0] hover:text-[#FAFAFA]"
              )}
            >
              {run.name}
            </button>
          ))}
          {results
            .filter((r) => !runs.find((run) => run.id === r.runId))
            .map((r) => (
              <button
                key={r.runId}
                onClick={() => setSelectedScenario(r.runId)}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  selectedScenario === r.runId
                    ? "bg-[#A855F7]/20 text-[#A855F7]"
                    : "text-[#666666] hover:text-[#A855F7]"
                )}
              >
                {r.runName}
              </button>
            ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Compare dropdown */}
          <select
            value={compareScenario}
            onChange={(e) => setCompareScenario(e.target.value)}
            className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-xs text-[#A0A0A0] outline-none"
          >
            <option value="">Compare with...</option>
            {results
              .filter((r) => r.runId !== selectedScenario)
              .map((r) => (
                <option key={r.runId} value={r.runId}>
                  {r.runName}
                </option>
              ))}
          </select>

          <button
            onClick={() => setShowWhatIf(!showWhatIf)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
              showWhatIf
                ? "border-[#A855F7] bg-[#A855F7]/10 text-[#A855F7]"
                : "border-[#2A2A2A] bg-[#0A0A0A] text-[#A0A0A0] hover:border-[#3A3A3A] hover:text-[#FAFAFA]"
            )}
          >
            What-if
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      {activeResult && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Runway"
            value={
              activeResult.runway >= 90
                ? "90+ days"
                : `${activeResult.runway} days`
            }
            subtitle={
              activeResult.runway < 30
                ? "Critical"
                : activeResult.runway < 60
                  ? "Watch"
                  : "Healthy"
            }
            icon={<Calendar className="size-5" />}
          />
          <KpiCard
            label="Min Balance"
            value={formatCurrency(activeResult.minBalance)}
            subtitle={
              activeResult.minBalance < 0
                ? "Goes negative!"
                : "Stays positive"
            }
            icon={
              activeResult.minBalance < 0 ? (
                <AlertTriangle className="size-5 text-[#EF4444]" />
              ) : (
                <TrendingDown className="size-5" />
              )
            }
          />
          <KpiCard
            label="Cash-Zero Date"
            value={
              activeResult.cashZeroDate
                ? new Date(
                    activeResult.cashZeroDate + "T00:00:00"
                  ).toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                  })
                : "None"
            }
            subtitle={
              activeResult.cashZeroDate ? "Balance hits zero" : "Within horizon"
            }
            icon={<AlertTriangle className="size-5" />}
          />
          <KpiCard
            label="End Balance"
            value={formatCurrency(
              activeResult.timeSeries[activeResult.timeSeries.length - 1]
                ?.base ?? 0
            )}
            subtitle="Day 90 projected"
            icon={<TrendingUp className="size-5" />}
          />
        </div>
      )}

      {/* Chart */}
      <div className="rounded-[12px] border border-[#2A2A2A] bg-[#141414] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">
            Cash Balance Projection
            {activeResult && (
              <span className="ml-2 text-xs font-normal text-[#A0A0A0]">
                — {runs.find((r) => r.id === selectedScenario)?.name ?? activeResult.runName}
              </span>
            )}
          </h3>
          {compareResult && (
            <span className="text-xs text-[#A855F7]">
              vs {compareResult.runName}
            </span>
          )}
        </div>

        {loading ? (
          <ChartSkeleton />
        ) : activeResult ? (
          <RechartsArea
            data={activeResult.timeSeries}
            overlayData={compareResult?.timeSeries}
            overlayName={compareResult?.runName}
          />
        ) : (
          <div className="flex h-[400px] items-center justify-center text-sm text-[#666666]">
            No forecast data available
          </div>
        )}

        {/* Income event markers legend */}
        {activeResult && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-[#A0A0A0]">
            {activeResult.timeSeries
              .filter((p) => p.events.length > 0)
              .slice(0, 8)
              .map((p) => (
                <span key={p.date} className="flex items-center gap-1">
                  <span
                    className={cn(
                      "inline-block size-1.5 rounded-full",
                      p.events.some((e) => e.direction === "inflow")
                        ? "bg-[#22C55E]"
                        : "bg-[#EF4444]"
                    )}
                  />
                  {new Date(p.date + "T00:00:00").toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                  })}
                  : {p.events.map((e) => e.name).join(", ")}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* What-if Panel */}
      {showWhatIf && (
        <div className="rounded-[12px] border border-[#A855F7]/30 bg-[#141414] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#FAFAFA]">
              What-if Analysis
            </h3>
            <button
              onClick={() => setShowWhatIf(false)}
              className="text-[#666666] hover:text-[#FAFAFA]"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {/* Type selector */}
            <div>
              <label className="mb-1 block text-xs text-[#A0A0A0]">
                Action
              </label>
              <select
                value={whatIf.type}
                onChange={(e) =>
                  setWhatIf({ ...whatIf, type: e.target.value as WhatIfType })
                }
                className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
              >
                <option value="delay_payment">Delay Payment</option>
                <option value="cut_expense">Cut Expense</option>
                <option value="add_income">Add Income</option>
                <option value="add_recurring">New Recurring</option>
              </select>
            </div>

            {/* Conditional fields */}
            {(whatIf.type === "delay_payment" ||
              whatIf.type === "cut_expense") && (
              <div>
                <label className="mb-1 block text-xs text-[#A0A0A0]">
                  Flow
                </label>
                <select
                  value={whatIf.flowName}
                  onChange={(e) =>
                    setWhatIf({ ...whatIf, flowName: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                >
                  <option value="">Select flow...</option>
                  {outflowNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {whatIf.type === "delay_payment" && (
              <div>
                <label className="mb-1 block text-xs text-[#A0A0A0]">
                  Delay (days)
                </label>
                <input
                  type="number"
                  value={whatIf.delayDays}
                  onChange={(e) =>
                    setWhatIf({
                      ...whatIf,
                      delayDays: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                />
              </div>
            )}

            {whatIf.type === "cut_expense" && (
              <div>
                <label className="mb-1 block text-xs text-[#A0A0A0]">
                  Keep % (e.g., 0.8 = 80%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={whatIf.factor}
                  onChange={(e) =>
                    setWhatIf({
                      ...whatIf,
                      factor: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                />
              </div>
            )}

            {whatIf.type === "add_income" && (
              <>
                <div>
                  <label className="mb-1 block text-xs text-[#A0A0A0]">
                    Name
                  </label>
                  <input
                    type="text"
                    value={whatIf.name}
                    onChange={(e) =>
                      setWhatIf({ ...whatIf, name: e.target.value })
                    }
                    placeholder="e.g., Side project payment"
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none placeholder:text-[#666666]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A0A0A0]">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={whatIf.amount || ""}
                    onChange={(e) =>
                      setWhatIf({
                        ...whatIf,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                  />
                </div>
              </>
            )}

            {(whatIf.type === "add_income" ||
              whatIf.type === "add_recurring") && (
              <div>
                <label className="mb-1 block text-xs text-[#A0A0A0]">
                  Date
                </label>
                <input
                  type="date"
                  value={whatIf.date}
                  onChange={(e) =>
                    setWhatIf({ ...whatIf, date: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleWhatIfPreview}
              className="flex items-center gap-2 rounded-lg bg-[#A855F7] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#9333EA]"
            >
              <Save className="size-3.5" />
              Save as Scenario
            </button>
            <button
              onClick={() => {
                setWhatIf(INITIAL_WHATIF);
                setShowWhatIf(false);
              }}
              className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#A0A0A0] transition-colors hover:border-[#3A3A3A] hover:text-[#FAFAFA]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Scheduled Flows Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#FAFAFA]">
            Scheduled Flows
            <span className="ml-2 text-xs font-normal text-[#A0A0A0]">
              {activeFlows.length} active
              {inactiveFlows.length > 0 && `, ${inactiveFlows.length} inactive`}
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => computeAll()}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs text-[#A0A0A0] transition-colors hover:border-[#3A3A3A] hover:text-[#FAFAFA] disabled:opacity-50"
            >
              {loading ? "Computing..." : "Recompute"}
            </button>
            <button
              onClick={() => setShowAddFlow(!showAddFlow)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                showAddFlow
                  ? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]"
                  : "border-[#2A2A2A] bg-[#0A0A0A] text-[#A0A0A0] hover:border-[#3A3A3A] hover:text-[#FAFAFA]"
              )}
            >
              <Plus className="size-3.5" />
              Add Flow
            </button>
          </div>
        </div>

        {/* Add flow form */}
        {showAddFlow && (
          <div className="mb-4 rounded-[12px] border border-[#3B82F6]/30 bg-[#141414] p-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-[#A0A0A0]">
                  Name
                </label>
                <input
                  type="text"
                  value={newFlow.name}
                  onChange={(e) =>
                    setNewFlow({ ...newFlow, name: e.target.value })
                  }
                  placeholder="Flow name"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none placeholder:text-[#666666]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#A0A0A0]">
                  Amount
                </label>
                <input
                  type="number"
                  value={newFlow.amount}
                  onChange={(e) =>
                    setNewFlow({ ...newFlow, amount: e.target.value })
                  }
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none placeholder:text-[#666666]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#A0A0A0]">
                  Direction
                </label>
                <select
                  value={newFlow.direction}
                  onChange={(e) =>
                    setNewFlow({
                      ...newFlow,
                      direction: e.target.value as FlowDirection,
                    })
                  }
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                >
                  <option value="outflow">Outflow</option>
                  <option value="inflow">Inflow</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#A0A0A0]">
                  Cadence
                </label>
                <select
                  value={newFlow.cadence}
                  onChange={(e) =>
                    setNewFlow({
                      ...newFlow,
                      cadence: e.target.value as FlowCadence,
                    })
                  }
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                >
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="weekly">Weekly</option>
                  <option value="one_time">One-time</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#A0A0A0]">
                  Due Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={newFlow.due_day}
                  onChange={(e) =>
                    setNewFlow({ ...newFlow, due_day: e.target.value })
                  }
                  placeholder="1-28"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none placeholder:text-[#666666]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#A0A0A0]">
                  Category
                </label>
                <input
                  type="text"
                  value={newFlow.category}
                  onChange={(e) =>
                    setNewFlow({ ...newFlow, category: e.target.value })
                  }
                  placeholder="e.g., housing"
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none placeholder:text-[#666666]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#A0A0A0]">
                  Probability
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={newFlow.probability}
                  onChange={(e) =>
                    setNewFlow({ ...newFlow, probability: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-sm text-[#FAFAFA] outline-none"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleAddFlow}
                  className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2563EB]"
                >
                  <Plus className="size-3.5" />
                  Add
                </button>
                <button
                  onClick={() => setShowAddFlow(false)}
                  className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm text-[#A0A0A0] transition-colors hover:text-[#FAFAFA]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <DataTable
          columns={flowColumns}
          data={flows}
          rowKey={(row) => row.id}
          pageSize={15}
        />
      </div>
    </div>
  );
}
