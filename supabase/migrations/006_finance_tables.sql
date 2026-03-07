-- 006_finance_tables.sql
-- Finance tables: transactions, debts, crypto_balances.
-- Part of BAS-20: Finance Data Seeding.

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  name        TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  type        TEXT NOT NULL
                CHECK (type IN ('expense', 'income')),
  category    TEXT,
  interval    TEXT NOT NULL DEFAULT 'one_time'
                CHECK (interval IN ('monthly', 'biweekly', 'weekly', 'one_time')),
  due_day     INTEGER,
  start_date  DATE,
  end_date    DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own transactions"
  ON transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DEBTS
-- ============================================================
CREATE TABLE IF NOT EXISTS debts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL
                    CHECK (type IN ('loan', 'credit_line', 'personal')),
  principal       NUMERIC NOT NULL,
  balance         NUMERIC NOT NULL,
  interest_rate   NUMERIC,
  min_payment     NUMERIC,
  due_day         INTEGER,
  lender          TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own debts"
  ON debts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CRYPTO_BALANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS crypto_balances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  symbol      TEXT NOT NULL,
  name        TEXT,
  quantity    NUMERIC NOT NULL DEFAULT 0,
  cost_basis  NUMERIC,
  wallet      TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE crypto_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own crypto balances"
  ON crypto_balances
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON crypto_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- BALANCE_SNAPSHOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS balance_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  chequing        NUMERIC,
  savings         NUMERIC,
  credit_available NUMERIC,
  total_debt      NUMERIC,
  net_worth       NUMERIC,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE balance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own balance snapshots"
  ON balance_snapshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
