-- Ingest event ledger for cross-ledger reconciliation between n8n and Vercel
-- Tracks every accepted webhook payload before processing to detect silent data loss

CREATE TYPE ingest_event_status AS ENUM (
  'received',
  'processing',
  'processed',
  'failed',
  'dead_letter'
);

CREATE TABLE ingest_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source           text NOT NULL,
  entity_type      text NOT NULL,
  idempotency_key  text NOT NULL UNIQUE,
  received_at      timestamptz NOT NULL DEFAULT now(),
  payload_hash     text NOT NULL,
  n8n_execution_id text,
  status           ingest_event_status NOT NULL DEFAULT 'received',
  attempt_count    integer NOT NULL DEFAULT 0,
  last_error       text,
  processed_at     timestamptz
);

-- Fast lookups for reconciliation queries
CREATE INDEX idx_ingest_events_status_received_at
  ON ingest_events (status, received_at);

CREATE INDEX idx_ingest_events_source_received_at
  ON ingest_events (source, received_at);
