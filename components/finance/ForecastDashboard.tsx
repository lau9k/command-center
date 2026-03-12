"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ScheduledFlow, ForecastRun, ForecastResult } from "./forecast/types";
import { ScenarioControls } from "./forecast/ScenarioControls";
import { ForecastSummary } from "./forecast/ForecastSummary";
import { ForecastCharts } from "./forecast/ForecastCharts";
import { ForecastTable } from "./forecast/ForecastTable";

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

  const activeResult = useMemo(
    () => results.find((r) => r.runId === selectedScenario),
    [results, selectedScenario]
  );

  const compareResult = useMemo(
    () => (compareScenario ? results.find((r) => r.runId === compareScenario) : undefined),
    [results, compareScenario]
  );

  const handleToggleFlow = useCallback(async (id: string, active: boolean) => {
    await fetch("/api/finance/scheduled-flows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: active }),
    });
    setFlows((prev) => prev.map((f) => (f.id === id ? { ...f, is_active: active } : f)));
  }, []);

  const handleDeleteFlow = useCallback(async (id: string) => {
    await fetch(`/api/finance/scheduled-flows?id=${id}`, { method: "DELETE" });
    setFlows((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleAddFlow = useCallback(async (flow: {
    name: string; amount: number; direction: string; cadence: string;
    due_day: number | null; category: string | null; probability: number;
  }): Promise<boolean> => {
    const res = await fetch("/api/finance/scheduled-flows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(flow),
    });
    if (res.ok) {
      const created: ScheduledFlow = await res.json();
      setFlows((prev) => [...prev, created]);
      return true;
    }
    return false;
  }, []);

  const activeFlows = useMemo(() => flows.filter((f) => f.is_active), [flows]);
  const inactiveFlows = useMemo(() => flows.filter((f) => !f.is_active), [flows]);
  const outflowNames = useMemo(
    () => flows.filter((f) => f.direction === "outflow").map((f) => f.name),
    [flows]
  );

  return (
    <div className="flex flex-col gap-6">
      <ScenarioControls
        runs={runs}
        results={results}
        selectedScenario={selectedScenario}
        compareScenario={compareScenario}
        activeResult={activeResult}
        outflowNames={outflowNames}
        onSelectScenario={setSelectedScenario}
        onCompareScenario={setCompareScenario}
        onComputeAll={computeAll}
      />

      {activeResult && <ForecastSummary activeResult={activeResult} />}

      <ForecastCharts
        loading={loading}
        activeResult={activeResult}
        compareResult={compareResult}
        selectedScenario={selectedScenario}
        runs={runs}
      />

      <ForecastTable
        flows={flows}
        activeCount={activeFlows.length}
        inactiveCount={inactiveFlows.length}
        loading={loading}
        onToggleFlow={handleToggleFlow}
        onDeleteFlow={handleDeleteFlow}
        onAddFlow={handleAddFlow}
        onRecompute={computeAll}
      />
    </div>
  );
}
