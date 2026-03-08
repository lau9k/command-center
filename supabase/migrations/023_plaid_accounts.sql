-- 023_plaid_accounts.sql
-- Add plaid_accounts table and status column on plaid_items.
-- Part of BAS-45: Plaid Link UI Component + Connected Accounts Display.

-- Add status column to plaid_items
ALTER TABLE plaid_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- ============================================================
-- PLAID_ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS plaid_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          TEXT NOT NULL,
  plaid_item_id    UUID NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  account_id       TEXT UNIQUE NOT NULL,
  name             TEXT,
  official_name    TEXT,
  type             TEXT,
  subtype          TEXT,
  mask             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE plaid_accounts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON plaid_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_plaid_accounts_item
  ON plaid_accounts (plaid_item_id);
