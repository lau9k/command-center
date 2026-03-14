-- ─── Webhook Events – add retry tracking columns ────────────────────────────
-- Extends the webhook_events table with retry_count and last_retry_at
-- needed by the webhook event log retry management feature.

ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS retry_count    integer DEFAULT 0;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS last_retry_at  timestamptz;
