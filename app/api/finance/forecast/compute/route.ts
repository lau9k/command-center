import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { forecastComputeSchema } from "@/lib/validations";
import { withAuth } from "@/lib/auth/api-guard";
import type {
  ScheduledFlow,
  ForecastRun,
  ForecastTransform,
  ForecastEvent,
  ForecastDayPoint,
  ForecastResult,
} from "@/lib/types/database";

interface ActiveFlow {
  name: string;
  amount: number;
  direction: "inflow" | "outflow";
  cadence: string;
  dueDay: number | null;
  startDate: Date | null;
  endDate: Date | null;
  probability: number;
  category: string | null;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isDueOnDate(flow: ActiveFlow, date: Date, startDate: Date): boolean {
  if (flow.startDate && date < flow.startDate) return false;
  if (flow.endDate && date > flow.endDate) return false;

  const dayOfMonth = date.getDate();

  switch (flow.cadence) {
    case "monthly":
      return flow.dueDay ? dayOfMonth === flow.dueDay : dayOfMonth === 1;
    case "biweekly": {
      const diffTime = date.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays % 14 === 0;
    }
    case "weekly": {
      const diffTime = date.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays % 7 === 0;
    }
    case "one_time":
      return false; // handled separately via transforms
    default:
      return false;
  }
}

function applyTransforms(
  flows: ActiveFlow[],
  transforms: ForecastTransform[],
  oneTimeEvents: { name: string; amount: number; direction: "inflow" | "outflow"; date: Date }[]
): void {
  for (const t of transforms) {
    switch (t.type) {
      case "toggle_flow": {
        const flow = flows.find((f) => f.name === t.flow_name);
        if (flow && t.active === false) {
          flow.amount = 0;
        } else if (t.flow_name && t.active === true) {
          const disabled = flows.find((f) => f.name === t.flow_name);
          if (disabled) disabled.amount = disabled.amount || 0;
        }
        break;
      }
      case "delay_flow": {
        const flow = flows.find((f) => f.name === t.flow_name);
        if (flow && t.delay_days) {
          flow.dueDay = flow.dueDay
            ? Math.min(28, flow.dueDay + t.delay_days)
            : t.delay_days;
        }
        break;
      }
      case "scale_flow": {
        const flow = flows.find((f) => f.name === t.flow_name);
        if (flow && t.factor !== undefined) {
          flow.amount = flow.amount * t.factor;
        }
        break;
      }
      case "add_one_time": {
        if (t.name && t.amount && t.direction && t.date) {
          oneTimeEvents.push({
            name: t.name,
            amount: t.amount,
            direction: t.direction,
            date: new Date(t.date),
          });
        }
        break;
      }
    }
  }
}

function computeForecast(
  run: ForecastRun,
  scheduledFlows: ScheduledFlow[]
): ForecastDayPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeFlows: ActiveFlow[] = scheduledFlows
    .filter((f) => f.is_active)
    .map((f) => ({
      name: f.name,
      amount: Number(f.amount),
      direction: f.direction,
      cadence: f.cadence,
      dueDay: f.due_day,
      startDate: f.start_date ? new Date(f.start_date) : null,
      endDate: f.end_date ? new Date(f.end_date) : null,
      probability: Number(f.probability),
      category: f.category,
    }));

  const oneTimeEvents: { name: string; amount: number; direction: "inflow" | "outflow"; date: Date }[] = [];

  applyTransforms(activeFlows, run.transforms, oneTimeEvents);

  const timeSeries: ForecastDayPoint[] = [];
  let baseBalance = Number(run.starting_cash);
  let bestBalance = baseBalance;
  let worstBalance = baseBalance;

  for (let day = 0; day < run.horizon_days; day++) {
    const currentDate = addDays(today, day);
    const events: ForecastEvent[] = [];
    let dayInflows = 0;
    let dayOutflows = 0;

    // Check scheduled flows
    for (const flow of activeFlows) {
      if (flow.amount === 0) continue;
      if (!isDueOnDate(flow, currentDate, today)) continue;

      events.push({
        name: flow.name,
        amount: flow.amount,
        direction: flow.direction,
        type: flow.category ?? undefined,
      });

      if (flow.direction === "inflow") {
        dayInflows += flow.amount * flow.probability;
      } else {
        dayOutflows += flow.amount;
      }
    }

    // Check one-time events
    for (const evt of oneTimeEvents) {
      if (formatDate(evt.date) === formatDate(currentDate)) {
        events.push({
          name: evt.name,
          amount: evt.amount,
          direction: evt.direction,
        });
        if (evt.direction === "inflow") {
          dayInflows += evt.amount;
        } else {
          dayOutflows += evt.amount;
        }
      }
    }

    const netFlow = dayInflows - dayOutflows;
    baseBalance += netFlow;

    // Best case: inflows arrive at full amount (ignore probability discount)
    const bestInflows = events
      .filter((e) => e.direction === "inflow")
      .reduce((sum, e) => sum + e.amount, 0);
    const bestNetFlow = bestInflows - dayOutflows;
    bestBalance += day === 0 ? netFlow : bestNetFlow;

    // Worst case: inflows may not arrive
    const worstInflows = events
      .filter((e) => e.direction === "inflow")
      .reduce((sum, e) => {
        const flow = activeFlows.find((f) => f.name === e.name);
        const prob = flow ? flow.probability : 1;
        return sum + e.amount * Math.max(0, prob - 0.2);
      }, 0);
    const worstNetFlow = worstInflows - dayOutflows;
    worstBalance += day === 0 ? netFlow : worstNetFlow;

    timeSeries.push({
      date: formatDate(currentDate),
      dayIndex: day,
      base: Math.round(baseBalance * 100) / 100,
      best: Math.round(bestBalance * 100) / 100,
      worst: Math.round(worstBalance * 100) / 100,
      inflows: Math.round(dayInflows * 100) / 100,
      outflows: Math.round(dayOutflows * 100) / 100,
      events,
    });
  }

  return timeSeries;
}

export const POST = withAuth(async function POST(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();
  const parsed = forecastComputeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { runId } = parsed.data;

  // Fetch scheduled flows
  const { data: flows, error: flowsErr } = await supabase
    .from("scheduled_flows")
    .select("*")
    .order("name");

  if (flowsErr) {
    return NextResponse.json({ error: flowsErr.message }, { status: 500 });
  }

  // If a specific run is requested, compute just that one
  if (runId) {
    const { data: run, error: runErr } = await supabase
      .from("forecast_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (runErr || !run) {
      return NextResponse.json(
        { error: runErr?.message ?? "Run not found" },
        { status: 404 }
      );
    }

    const timeSeries = computeForecast(
      run as ForecastRun,
      (flows ?? []) as ScheduledFlow[]
    );
    const minBalance = Math.min(...timeSeries.map((p) => p.base));
    const cashZeroDay = timeSeries.find((p) => p.base <= 0);

    const result: ForecastResult = {
      runId: run.id,
      runName: run.name,
      timeSeries,
      runway: cashZeroDay ? cashZeroDay.dayIndex : timeSeries.length,
      minBalance: Math.round(minBalance * 100) / 100,
      cashZeroDate: cashZeroDay?.date ?? null,
    };

    // Cache results
    await supabase
      .from("cash_forecasts")
      .delete()
      .eq("forecast_run_id", run.id);

    const cacheRows = timeSeries.map((point) => ({
      user_id: run.user_id,
      forecast_run_id: run.id,
      forecast_date: point.date,
      day_index: point.dayIndex,
      base_balance: point.base,
      best_balance: point.best,
      worst_balance: point.worst,
      inflows: point.inflows,
      outflows: point.outflows,
      events: point.events,
    }));

    await supabase.from("cash_forecasts").insert(cacheRows);

    return NextResponse.json(result);
  }

  // Compute all scenarios
  const { data: runs, error: runsErr } = await supabase
    .from("forecast_runs")
    .select("*")
    .order("is_preset", { ascending: false })
    .order("name");

  if (runsErr) {
    return NextResponse.json({ error: runsErr.message }, { status: 500 });
  }

  const results: ForecastResult[] = [];

  for (const run of (runs ?? []) as ForecastRun[]) {
    const timeSeries = computeForecast(run, (flows ?? []) as ScheduledFlow[]);
    const minBalance = Math.min(...timeSeries.map((p) => p.base));
    const cashZeroDay = timeSeries.find((p) => p.base <= 0);

    // Persist results: delete old, insert new
    await supabase
      .from("cash_forecasts")
      .delete()
      .eq("forecast_run_id", run.id);

    const cacheRows = timeSeries.map((point) => ({
      user_id: run.user_id,
      forecast_run_id: run.id,
      forecast_date: point.date,
      day_index: point.dayIndex,
      base_balance: point.base,
      best_balance: point.best,
      worst_balance: point.worst,
      inflows: point.inflows,
      outflows: point.outflows,
      events: point.events,
    }));

    await supabase.from("cash_forecasts").insert(cacheRows);

    results.push({
      runId: run.id,
      runName: run.name,
      timeSeries,
      runway: cashZeroDay ? cashZeroDay.dayIndex : timeSeries.length,
      minBalance: Math.round(minBalance * 100) / 100,
      cashZeroDate: cashZeroDay?.date ?? null,
    });
  }

  return NextResponse.json(results);
});
