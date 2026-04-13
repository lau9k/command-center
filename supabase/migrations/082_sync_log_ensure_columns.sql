-- Ensure sync_log has all columns expected by the application code.
-- Migration 048 used CREATE TABLE (without IF NOT EXISTS) which fails
-- when the table already exists from 039. This left records_found and
-- metadata missing. Migration 079 (records_skipped) may also have been
-- blocked if the migration runner halted on 048.
--
-- This migration is fully idempotent — safe to run regardless of which
-- prior migrations succeeded.

ALTER TABLE sync_log
  ADD COLUMN IF NOT EXISTS records_found   integer DEFAULT 0;

ALTER TABLE sync_log
  ADD COLUMN IF NOT EXISTS records_skipped integer DEFAULT 0;

ALTER TABLE sync_log
  ADD COLUMN IF NOT EXISTS metadata        jsonb;

-- Expand status CHECK to include 'warning' (used by granola-sync).
-- Drop the old constraint first (may or may not exist).
ALTER TABLE sync_log DROP CONSTRAINT IF EXISTS sync_log_status_check;
ALTER TABLE sync_log ADD CONSTRAINT sync_log_status_check
  CHECK (status IN ('success', 'error', 'partial', 'running', 'warning'));

-- Backfill records_found where it was never set
UPDATE sync_log
  SET records_found = COALESCE(records_synced, record_count, 0)
  WHERE records_found IS NULL;
