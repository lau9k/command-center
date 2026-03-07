-- 014_split_transactions.sql
-- Add split_group_id to transactions for split transaction support.
-- Transactions sharing the same split_group_id represent portions of a single
-- transaction split across multiple wallets/categories.

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS split_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_transactions_split_group_id
  ON transactions (split_group_id)
  WHERE split_group_id IS NOT NULL;
