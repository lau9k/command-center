import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import type { CashForecast, ForecastDayPoint, ForecastResult } from "@/lib/types/database";

function toTimeSeries(rows: CashForecast[]): ForecastDayPoint[] {
  return rows.map((r) => ({
    date: r.forecast_date,
    dayIndex: r.day_index,
    base: r.base_balance,
    best: r.best_balance,
    worst: r.worst_balance,
    inflows: r.inflows,
    outflows: r.outflows,
    events: r.events,
  }));
}

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;
  const forecastRunId = searchParams.get("forecast_run_id");

  if (forecastRunId) {
    // Fetch results for a specific run
    const { data: rows, error } = await supabase
      .from("cash_forecasts")
      .select("*")
      .eq("forecast_run_id", forecastRunId)
      .order("day_index", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const forecasts = (rows ?? []) as CashForecast[];

    if (forecasts.length === 0) {
      return NextResponse.json({ error: "No results found for this run" }, { status: 404 });
    }

    // Get the run name
    const { data: run } = await supabase
      .from("forecast_runs")
      .select("id, name")
      .eq("id", forecastRunId)
      .single();

    const timeSeries = toTimeSeries(forecasts);
    const minBalance = Math.min(...timeSeries.map((p) => p.base));
    const cashZeroDay = timeSeries.find((p) => p.base <= 0);

    const result: ForecastResult = {
      runId: forecastRunId,
      runName: run?.name ?? "Unknown",
      timeSeries,
      runway: cashZeroDay ? cashZeroDay.dayIndex : timeSeries.length,
      minBalance: Math.round(minBalance * 100) / 100,
      cashZeroDate: cashZeroDay?.date ?? null,
    };

    return NextResponse.json(result);
  }

  // No forecast_run_id — return most recent forecast run's results
  const { data: latestRun, error: runError } = await supabase
    .from("forecast_runs")
    .select("id, name")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (runError || !latestRun) {
    return NextResponse.json({ error: "No forecast runs found" }, { status: 404 });
  }

  const { data: rows, error } = await supabase
    .from("cash_forecasts")
    .select("*")
    .eq("forecast_run_id", latestRun.id)
    .order("day_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const forecasts = (rows ?? []) as CashForecast[];

  if (forecasts.length === 0) {
    return NextResponse.json({ error: "No results found" }, { status: 404 });
  }

  const timeSeries = toTimeSeries(forecasts);
  const minBalance = Math.min(...timeSeries.map((p) => p.base));
  const cashZeroDay = timeSeries.find((p) => p.base <= 0);

  const result: ForecastResult = {
    runId: latestRun.id,
    runName: latestRun.name,
    timeSeries,
    runway: cashZeroDay ? cashZeroDay.dayIndex : timeSeries.length,
    minBalance: Math.round(minBalance * 100) / 100,
    cashZeroDate: cashZeroDay?.date ?? null,
  };

  return NextResponse.json(result);
});
