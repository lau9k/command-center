-- Enhance sync_log for automated/system syncs (e.g. Plaid cron)
-- Make user_id nullable since system syncs have no auth context
ALTER TABLE sync_log ALTER COLUMN user_id DROP NOT NULL;

-- Allow 'partial' status for partial sync completions
ALTER TABLE sync_log DROP CONSTRAINT IF EXISTS sync_log_status_check;
ALTER TABLE sync_log ADD CONSTRAINT sync_log_status_check
  CHECK (status IN ('success', 'error', 'partial', 'running'));

-- Add columns for richer sync tracking
ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS started_at timestamptz DEFAULT now();
ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE sync_log ADD COLUMN IF NOT EXISTS records_synced integer DEFAULT 0;

-- Service role needs full access (bypasses RLS, but explicit policy is good practice)
CREATE POLICY "Service role full access on sync_log"
  ON sync_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index on source + started_at for quick lookups
CREATE INDEX IF NOT EXISTS idx_sync_log_source_started ON sync_log(source, started_at DESC);
