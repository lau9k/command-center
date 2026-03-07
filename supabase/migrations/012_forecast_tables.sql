-- 012_forecast_tables.sql
-- Forecast engine tables: scheduled_flows, forecast_runs, cash_forecasts.
-- Part of BAS-25: Finance Module — Forecast Engine.

-- ============================================================
-- SCHEDULED_FLOWS
-- Recurring or one-time cash flows used as inputs for forecasting.
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduled_flows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  name            TEXT NOT NULL,
  amount          NUMERIC NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('inflow', 'outflow')),
  cadence         TEXT NOT NULL DEFAULT 'monthly'
                    CHECK (cadence IN ('monthly', 'biweekly', 'weekly', 'one_time')),
  due_day         INTEGER,
  start_date      DATE,
  end_date        DATE,
  category        TEXT,
  probability     NUMERIC DEFAULT 1.0,
  earliest_date   DATE,
  latest_date     DATE,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE scheduled_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scheduled flows"
  ON scheduled_flows
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON scheduled_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FORECAST_RUNS
-- Named scenarios with optional transform rules.
-- ============================================================
CREATE TABLE IF NOT EXISTS forecast_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  horizon_days    INTEGER NOT NULL DEFAULT 90,
  starting_cash   NUMERIC NOT NULL DEFAULT 0,
  transforms      JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_preset       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE forecast_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own forecast runs"
  ON forecast_runs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON forecast_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CASH_FORECASTS
-- Cached daily projection results for a forecast run.
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_forecasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  forecast_run_id UUID NOT NULL REFERENCES forecast_runs(id) ON DELETE CASCADE,
  forecast_date   DATE NOT NULL,
  day_index       INTEGER NOT NULL,
  base_balance    NUMERIC NOT NULL DEFAULT 0,
  best_balance    NUMERIC NOT NULL DEFAULT 0,
  worst_balance   NUMERIC NOT NULL DEFAULT 0,
  inflows         NUMERIC NOT NULL DEFAULT 0,
  outflows        NUMERIC NOT NULL DEFAULT 0,
  events          JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cash_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cash forecasts"
  ON cash_forecasts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_cash_forecasts_run ON cash_forecasts(forecast_run_id, day_index);
