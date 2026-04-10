-- Memory ingestion log for Personize dedup tracking.
-- Tracks every memorize call so we can content-hash-deduplicate before sending.
-- Reconciled to the 10-column schema expected by the API route.

DROP TABLE IF EXISTS memory_ingestion_log;

CREATE TABLE IF NOT EXISTS memory_ingestion_log (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id         uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  contact_email      text,
  source_type        text        NOT NULL
    CHECK (source_type IN ('decisions', 'session_note', 'call_transcript', 'intake_file', 'manual')),
  source_ref         text        NOT NULL,
  content_hash       text        NOT NULL,
  personize_event_id text,
  status             text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'confirmed', 'failed')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  payload_preview    text
);

-- Unique constraint on content_hash for dedup
CREATE UNIQUE INDEX idx_memory_ingestion_log_content_hash
  ON memory_ingestion_log (content_hash);

-- Lookup by contact email
CREATE INDEX idx_memory_ingestion_log_contact_email
  ON memory_ingestion_log (contact_email);

-- Filter by source type
CREATE INDEX idx_memory_ingestion_log_source_type
  ON memory_ingestion_log (source_type);

COMMENT ON TABLE memory_ingestion_log IS 'Audit log and dedup index for Personize memory ingestion';

-- RLS (service-role only) -----------------------------------------------------
ALTER TABLE memory_ingestion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access on memory_ingestion_log"
  ON memory_ingestion_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
