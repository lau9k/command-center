-- 019_fix_transactions_table.sql
-- BAS-40: Create missing transactions table + seed March 2026 sample data.
-- Consolidated from 006, 010, 014 — idempotent so it can be applied
-- regardless of whether earlier migrations ran.

-- ============================================================
-- ENSURE update_updated_at() function exists
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRANSACTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL,
  name                      TEXT NOT NULL,
  amount                    NUMERIC NOT NULL,
  type                      TEXT NOT NULL
                              CHECK (type IN ('expense', 'income')),
  category                  TEXT,
  interval                  TEXT NOT NULL DEFAULT 'one_time'
                              CHECK (interval IN ('monthly', 'biweekly', 'weekly', 'one_time')),
  due_day                   INTEGER,
  start_date                DATE,
  end_date                  DATE,
  notes                     TEXT,
  -- From 010_reimbursements_tables
  is_reimbursable           BOOLEAN NOT NULL DEFAULT false,
  reimbursement_request_id  UUID,
  -- From 014_split_transactions
  split_group_id            UUID,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add columns if table existed without them
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_reimbursable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS reimbursement_request_id UUID;
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS split_group_id UUID;

-- ============================================================
-- RLS + POLICIES
-- ============================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transactions'
      AND policyname = 'Users can manage their own transactions'
  ) THEN
    CREATE POLICY "Users can manage their own transactions"
      ON transactions FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- SERVICE ROLE POLICY (bypass RLS for API routes using service key)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transactions'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON transactions FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_split_group_id
  ON transactions (split_group_id)
  WHERE split_group_id IS NOT NULL;

-- ============================================================
-- TRIGGER
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'set_updated_at'
      AND event_object_table = 'transactions'
  ) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ============================================================
-- SEED DATA — March 2026 (15-20 rows)
-- Only insert if the table is empty to avoid duplicates.
-- ============================================================
INSERT INTO transactions (user_id, name, amount, type, category, interval, due_day, start_date, notes)
SELECT * FROM (VALUES
  -- ============================================================
  -- INCOME (recurring + one-time)
  -- ============================================================
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Personize - Contract Income',  4500.00, 'income',  'freelance',    'biweekly',  15,  '2025-09-01'::DATE, 'Main contract'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Freelance Web Dev',            2000.00, 'income',  'freelance',    'one_time',  NULL::INTEGER, '2026-03-03'::DATE, 'One-off project'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'MEEK - Revenue Share',          800.00, 'income',  'business',     'monthly',   1,    '2025-06-01'::DATE, 'Telegram bot revenue'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Eventium - Consulting',         600.00, 'income',  'consulting',   'monthly',   15,   '2026-01-01'::DATE, 'Monthly retainer'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Tax Refund (CRA)',             2100.00, 'income',  'tax_refund',   'one_time',  NULL::INTEGER, '2026-03-05'::DATE, '2025 tax year refund'),

  -- ============================================================
  -- EXPENSES — Housing & Utilities
  -- ============================================================
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Rent',                         1245.00, 'expense', 'housing',       'monthly',  1,    '2025-01-01'::DATE, 'Room rental'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Hydro (Toronto Hydro)',          65.00, 'expense', 'utilities',     'monthly',  15,   '2025-01-01'::DATE, NULL::TEXT),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Internet (Bell)',                85.00, 'expense', 'utilities',     'monthly',  20,   '2025-01-01'::DATE, NULL::TEXT),

  -- ============================================================
  -- EXPENSES — Subscriptions
  -- ============================================================
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Spotify Premium',                11.99, 'expense', 'subscriptions', 'monthly',  5,    '2025-01-01'::DATE, NULL::TEXT),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'ChatGPT Plus',                   27.00, 'expense', 'subscriptions', 'monthly',  12,   '2025-06-01'::DATE, 'USD converted'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Claude Pro',                     27.00, 'expense', 'subscriptions', 'monthly',  12,   '2025-09-01'::DATE, 'USD converted'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'YouTube Premium',                13.99, 'expense', 'subscriptions', 'monthly',  8,    '2025-01-01'::DATE, NULL::TEXT),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Vercel Pro',                     27.00, 'expense', 'subscriptions', 'monthly',  1,    '2025-03-01'::DATE, 'USD converted'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Supabase Pro',                   34.00, 'expense', 'subscriptions', 'monthly',  1,    '2025-06-01'::DATE, 'USD converted'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'GitHub Copilot',                 13.00, 'expense', 'subscriptions', 'monthly',  18,   '2025-01-01'::DATE, 'USD converted'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Notion Plus',                    14.00, 'expense', 'subscriptions', 'monthly',  15,   '2025-01-01'::DATE, NULL::TEXT),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Netflix',                        20.99, 'expense', 'subscriptions', 'monthly',  3,    '2025-01-01'::DATE, 'Standard plan'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Domain (Namecheap)',             18.00, 'expense', 'subscriptions', 'monthly',  10,   '2025-01-01'::DATE, 'Avg monthly from annual'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Apple iCloud+ (200GB)',           3.99, 'expense', 'subscriptions', 'monthly',  5,    '2025-01-01'::DATE, NULL::TEXT),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Linear (Startup plan)',           0.00, 'expense', 'subscriptions', 'monthly',  1,    '2026-01-01'::DATE, 'Free tier'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Figma',                           0.00, 'expense', 'subscriptions', 'monthly',  1,    '2025-01-01'::DATE, 'Free tier'),

  -- ============================================================
  -- EXPENSES — Food & Groceries
  -- ============================================================
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Groceries (No Frills / FreshCo)', 400.00, 'expense', 'food',       'monthly',  NULL::INTEGER, '2025-01-01'::DATE, 'Estimated monthly avg'),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Restaurants / Takeout',          100.00, 'expense', 'food',         'monthly',  NULL::INTEGER, '2025-01-01'::DATE, 'Estimated monthly avg'),

  -- ============================================================
  -- EXPENSES — Transportation
  -- ============================================================
  ('00000000-0000-0000-0000-000000000000'::UUID, 'TTC Metropass',                  150.00, 'expense', 'transportation', 'monthly', 1,   '2025-01-01'::DATE, NULL::TEXT),

  -- ============================================================
  -- EXPENSES — Entertainment
  -- ============================================================
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Going out / Events',              50.00, 'expense', 'entertainment', 'monthly', NULL::INTEGER, '2025-01-01'::DATE, 'Estimated avg'),

  -- ============================================================
  -- EXPENSES — One-time March 2026
  -- ============================================================
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Uber Eats (birthday dinner)',     62.50, 'expense', 'food',          'one_time', NULL::INTEGER, '2026-03-01'::DATE, NULL::TEXT),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Winter jacket (Uniqlo)',          89.99, 'expense', 'shopping',      'one_time', NULL::INTEGER, '2026-03-02'::DATE, NULL::TEXT),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Pharmacy (Shoppers)',             22.40, 'expense', 'health',        'one_time', NULL::INTEGER, '2026-03-03'::DATE, NULL::TEXT),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Dentist co-pay',                 45.00, 'expense', 'health',        'one_time', NULL::INTEGER, '2026-03-04'::DATE, NULL::TEXT),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'LCBO',                            38.75, 'expense', 'entertainment', 'one_time', NULL::INTEGER, '2026-03-05'::DATE, NULL::TEXT),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Presto reload',                  50.00, 'expense', 'transportation', 'one_time', NULL::INTEGER, '2026-03-06'::DATE, NULL::TEXT),
  ('00000000-0000-0000-0000-000000000000'::UUID, 'Coffee beans (Dark Horse)',       24.00, 'expense', 'food',          'one_time', NULL::INTEGER, '2026-03-07'::DATE, NULL::TEXT)

) AS v(user_id, name, amount, type, category, interval, due_day, start_date, notes)
WHERE NOT EXISTS (SELECT 1 FROM transactions LIMIT 1);

-- ============================================================
-- UPDATE combined_transactions VIEW
-- Include type column; conditionally include bank_transactions.
-- ============================================================
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bank_transactions'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE VIEW combined_transactions AS
        SELECT
          id,
          user_id::TEXT         AS user_id,
          start_date            AS date,
          amount,
          name                  AS description,
          category,
          type,
          ''manual''            AS source
        FROM transactions
        WHERE start_date IS NOT NULL

        UNION ALL

        SELECT
          id,
          user_id,
          date,
          amount,
          COALESCE(merchant_name, name) AS description,
          category,
          NULL                  AS type,
          ''plaid''             AS source
        FROM bank_transactions
    ';
  ELSE
    EXECUTE '
      CREATE OR REPLACE VIEW combined_transactions AS
        SELECT
          id,
          user_id::TEXT         AS user_id,
          start_date            AS date,
          amount,
          name                  AS description,
          category,
          type,
          ''manual''            AS source
        FROM transactions
        WHERE start_date IS NOT NULL
    ';
  END IF;
END $$;
