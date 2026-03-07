-- 018_plaid_integration.sql
-- Plaid integration tables: plaid_items, bank_transactions, combined_transactions view.
-- Part of BAS-38: Supabase Schema for Plaid Integration.

-- ============================================================
-- PLAID_ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS plaid_items (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                TEXT NOT NULL,
  item_id                TEXT UNIQUE NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  plaid_cursor           TEXT,
  institution_name       TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON plaid_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- BANK_TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                TEXT NOT NULL,
  plaid_item_id          UUID NOT NULL REFERENCES plaid_items(id),
  plaid_transaction_id   TEXT UNIQUE NOT NULL,
  account_id             TEXT,
  name                   TEXT,
  merchant_name          TEXT,
  amount                 NUMERIC,
  iso_currency_code      TEXT DEFAULT 'CAD',
  date                   DATE NOT NULL,
  category               TEXT,
  pending                BOOLEAN DEFAULT false,
  raw                    JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index for faster lookups by user and date
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_date
  ON bank_transactions (user_id, date);

-- ============================================================
-- COMBINED_TRANSACTIONS VIEW
-- ============================================================
-- Unifies bank (Plaid) and manual transactions for the finance dashboard.
-- The manual transactions table uses start_date as the date column.
CREATE OR REPLACE VIEW combined_transactions AS
  SELECT
    id,
    user_id::TEXT        AS user_id,
    start_date           AS date,
    amount,
    name                 AS description,
    category,
    'manual'             AS source
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
    'plaid'              AS source
  FROM bank_transactions;
