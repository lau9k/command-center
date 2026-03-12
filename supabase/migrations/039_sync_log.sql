-- sync_log: tracks data source sync history
CREATE TABLE IF NOT EXISTS sync_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source      text NOT NULL,
  status      text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'running')),
  record_count integer NOT NULL DEFAULT 0,
  message     text,
  synced_at   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sync_log"
  ON sync_log
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sync_log_user_source ON sync_log(user_id, source);
CREATE INDEX idx_sync_log_synced_at ON sync_log(synced_at DESC);
