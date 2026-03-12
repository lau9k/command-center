-- ─── Webhook Events – add columns for full event logging ────────────────────
-- Extends the webhook_events table (created in 045) with additional columns
-- needed by /api/webhooks/events/route.ts.

ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS event_type    text;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS headers       jsonb;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS body          jsonb;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS response      jsonb;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS processed     boolean DEFAULT false;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS user_id       uuid REFERENCES auth.users(id);

-- Composite index for source + created_at queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_source_created
  ON webhook_events(source, created_at DESC);

-- RLS policy for user-scoped access (supplements existing service-role policy)
CREATE POLICY "Users can manage their own webhook_events"
  ON webhook_events
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
