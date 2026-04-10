-- Memory intake queue: holds markdown content to be memorized into Personize.

-- Queue table ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memory_intake_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_email     text,                          -- NULL = general Note
  content          text NOT NULL,                  -- markdown to memorize
  source_ref       text NOT NULL,                  -- e.g. '2026-04-09-intake-tracey-robertson.md'
  content_hash     text NOT NULL,                  -- SHA-256 hex for dedup
  status           text NOT NULL DEFAULT 'pending',-- pending | processing | done | failed
  personize_event_id text,
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_miq_status ON memory_intake_queue (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_miq_content_hash ON memory_intake_queue (content_hash);

COMMENT ON TABLE memory_intake_queue IS 'Queue of markdown intake files to be memorized into Personize';

-- RLS (service-role only) -----------------------------------------------------
ALTER TABLE memory_intake_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access on memory_intake_queue"
  ON memory_intake_queue
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
