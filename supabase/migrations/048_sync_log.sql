-- ─── Sync Log ───────────────────────────────────────────────────────────────
-- Tracks sync operations for gmail, plaid, granola, n8n, and personize.

CREATE TABLE sync_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL,
  status          text,
  started_at      timestamptz,
  completed_at    timestamptz,
  records_found   integer,
  records_synced  integer,
  error_message   text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  user_id         uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_sync_log_source_created ON sync_log(source, created_at DESC);

-- RLS
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sync_log entries"
  ON sync_log
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
