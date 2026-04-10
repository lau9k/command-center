-- Memory intake queue: holds markdown content to be memorized into Personize.
-- Memory ingestion log: dedup + audit trail for memorized content.

-- Queue table ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memory_intake_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_email     text,                          -- NULL → general Note
  content          text NOT NULL,                  -- markdown to memorize
  source_ref       text NOT NULL,                  -- e.g. '2026-04-09-intake-tracey-robertson.md'
  content_hash     text NOT NULL,                  -- SHA-256 hex for dedup
  status           text NOT NULL DEFAULT 'pending',-- pending | processing | done | failed
  personize_event_id text,
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz
);

CREATE INDEX idx_miq_status ON memory_intake_queue (status) WHERE status = 'pending';
CREATE INDEX idx_miq_content_hash ON memory_intake_queue (content_hash);

COMMENT ON TABLE memory_intake_queue IS 'Queue of markdown intake files to be memorized into Personize';

-- Ingestion log table (dedup + audit) ----------------------------------------
CREATE TABLE IF NOT EXISTS memory_ingestion_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash     text NOT NULL UNIQUE,           -- one entry per unique content
  source_ref       text NOT NULL,
  personize_event_id text,
  status           text NOT NULL,                  -- success | failed
  memorized_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mil_content_hash ON memory_ingestion_log (content_hash);

COMMENT ON TABLE memory_ingestion_log IS 'Audit log and dedup index for Personize memory ingestion';

-- RLS (service-role only — no user-facing access) ----------------------------
ALTER TABLE memory_intake_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_ingestion_log ENABLE ROW LEVEL SECURITY;
