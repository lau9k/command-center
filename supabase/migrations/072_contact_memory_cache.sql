-- Cache table for pre-computed Personize memory summaries per contact
CREATE TABLE IF NOT EXISTS contact_memory_cache (
  contact_id UUID PRIMARY KEY REFERENCES contacts(id) ON DELETE CASCADE,
  top_snippets JSONB NOT NULL DEFAULT '[]'::jsonb,
  digest_text TEXT,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  memory_count INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_contact_memory_cache_cached_at ON contact_memory_cache (cached_at);

COMMENT ON TABLE contact_memory_cache IS 'Pre-computed Personize smartRecall summaries for zero-latency contact list views';
