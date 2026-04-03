-- Add missing columns to ingest_events for payload storage, lease-based claiming,
-- and retry tracking. Required by the fast-ack 202 pipeline (PR #389).

-- 1. New columns
ALTER TABLE ingest_events
  ADD COLUMN IF NOT EXISTS payload          jsonb,
  ADD COLUMN IF NOT EXISTS claimed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_by       text,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_retry_at    timestamptz,
  ADD COLUMN IF NOT EXISTS last_failed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_code  text,
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz DEFAULT now();

-- 2. Add 'retryable' to the status enum
ALTER TYPE ingest_event_status ADD VALUE IF NOT EXISTS 'retryable';

-- 3. Indexes for the event processor claim loop
CREATE INDEX IF NOT EXISTS idx_ingest_events_claimable
  ON ingest_events (status, next_retry_at)
  WHERE status IN ('received', 'retryable');

CREATE INDEX IF NOT EXISTS idx_ingest_events_lease
  ON ingest_events (lease_expires_at)
  WHERE claimed_at IS NOT NULL AND status = 'processing';
