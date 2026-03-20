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
  const [hasResults, setHasResults] = useState(false);

  // Load persisted results on mount
  useEffect(() => {
    async function loadPersistedResults() {
      setLoading(true);
      try {
        // Try loading persisted results for all runs
        const fetches = runs.map((run) =>
          fetch(`/api/finance/forecast/results?forecast_run_id=${run.id}`)
            .then((res) => (res.ok ? res.json() as Promise<ForecastResult> : null))
            .catch(() => null)
        );
        const settled = await Promise.all(fetches);
        const persisted = settled.filter((r): r is ForecastResult => r !== null);

        if (persisted.length > 0) {
          setResults(persisted);
          setHasResults(true);
          if (!selectedScenario) {
            setSelectedScenario(persisted[0].runId);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    if (runs.length > 0) {
      loadPersistedResults();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setHasResults(data.length > 0);
        if (!selectedScenario && data.length > 0) {
          setSelectedScenario(data[0].runId);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [selectedScenario]);

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

  // Empty state: no results and not loading
  if (!loading && !hasResults && results.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
          <h3 className="text-lg font-semibold text-foreground">Run your first forecast</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Compute a cash forecast to see day-by-day projections with best and worst case scenarios.
          </p>
          <button
            onClick={computeAll}
            className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Run Forecast
          </button>
        </div>

        <ForecastTable
          flows={flows}
          activeCount={activeFlows.length}
          inactiveCount={inactiveFlows.length}
          loading={false}
          onToggleFlow={handleToggleFlow}
          onDeleteFlow={handleDeleteFlow}
          onAddFlow={handleAddFlow}
          onRecompute={computeAll}
        />
      </div>
    );
  }

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
