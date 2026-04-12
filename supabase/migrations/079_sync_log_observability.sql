-- Add records_skipped column and backfill records_found for observability.
-- records_found already exists (048_sync_log.sql) but was never populated.

ALTER TABLE sync_log
  ADD COLUMN IF NOT EXISTS records_skipped integer DEFAULT 0;

-- Backfill: set records_found = records_synced where it's still NULL
UPDATE sync_log SET records_found = COALESCE(records_synced, 0) WHERE records_found IS NULL;

COMMENT ON COLUMN sync_log.records_found IS 'Total rows returned by the upstream source (API, webhook, etc) before any filtering';
COMMENT ON COLUMN sync_log.records_skipped IS 'Rows that were dropped intentionally (dedup, filter) OR unintentionally (error). See error_message for detail.';
