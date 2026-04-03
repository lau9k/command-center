CREATE TABLE IF NOT EXISTS ingest_smoke_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  smoke_key text NOT NULL UNIQUE,
  event_id uuid,
  source text NOT NULL DEFAULT 'synthetic_smoke',
  passed boolean NOT NULL DEFAULT false,
  ingest_ack_ms integer,
  queue_to_claim_ms integer,
  claim_to_processed_ms integer,
  total_e2e_ms integer,
  dedup_ok boolean,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
