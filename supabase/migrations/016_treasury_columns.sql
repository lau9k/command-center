-- 016_treasury_columns.sql
-- Add treasury-specific columns to crypto_balances for BAS-28.
-- Adds chain, liquid/locked breakdown, and cached price fields.

ALTER TABLE crypto_balances
  ADD COLUMN IF NOT EXISTS chain TEXT,
  ADD COLUMN IF NOT EXISTS liquid_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_price_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS last_price_updated_at TIMESTAMPTZ;
