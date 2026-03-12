-- ─── Webhook Events ──────────────────────────────────────────────────────────
-- Stores truncated webhook event metadata for monitoring.
-- Never stores full payloads or sensitive headers.

CREATE TABLE IF NOT EXISTS webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL,
  endpoint      text NOT NULL,
  method        text NOT NULL DEFAULT 'POST',
  status_code   integer NOT NULL,
  payload_preview text,
  duration_ms   integer,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Enforce payload_preview max length at the database level
ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_payload_preview_length
  CHECK (char_length(payload_preview) <= 500);

-- Indexes for common query patterns
CREATE INDEX idx_webhook_events_source ON webhook_events (source);
CREATE INDEX idx_webhook_events_status_code ON webhook_events (status_code);
CREATE INDEX idx_webhook_events_created_at ON webhook_events (created_at DESC);

-- RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook_events"
  ON webhook_events
  FOR ALL
  USING (true)
  WITH CHECK (true);
