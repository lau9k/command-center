import { createClient } from "@/lib/supabase/server";
import { ForecastDashboard } from "@/components/finance/ForecastDashboard";
import type { ScheduledFlow, ForecastRun } from "@/lib/types/database";

export default async function ForecastPage() {
  const supabase = await createClient();

  const [flowsRes, runsRes] = await Promise.all([
    supabase
      .from("scheduled_flows")
      .select("*")
      .order("direction", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("forecast_runs")
      .select("*")
      .order("is_preset", { ascending: false })
      .order("name", { ascending: true }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Cash Flow Forecast
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scenario-driven runway projections and what-if analysis
        </p>
      </div>

      <ForecastDashboard
        scheduledFlows={(flowsRes.data as ScheduledFlow[]) ?? []}
        forecastRuns={(runsRes.data as ForecastRun[]) ?? []}
      />
    </div>
  );
}
