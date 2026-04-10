-- Contact identity map for entity resolution during memory ingestion.
-- Maps contact names, emails, aliases, and Personize record IDs so the
-- memory pipeline can resolve markdown mentions to specific contacts.

CREATE TABLE IF NOT EXISTS contact_identity_map (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  personize_record_id text,
  primary_email     text NOT NULL,
  alternate_emails  text[] NOT NULL DEFAULT '{}',
  canonical_name    text NOT NULL,
  aliases           text[] NOT NULL DEFAULT '{}',
  company_domain    text,
  confidence_score  float NOT NULL DEFAULT 1.0,
  last_verified_at  timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint on primary_email to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_map_primary_email
  ON contact_identity_map (primary_email);

-- GIN indexes for array containment searches on aliases / alternate_emails
CREATE INDEX IF NOT EXISTS idx_identity_map_aliases
  ON contact_identity_map USING gin (aliases);

CREATE INDEX IF NOT EXISTS idx_identity_map_alternate_emails
  ON contact_identity_map USING gin (alternate_emails);

-- Fast lookups by contact_id
CREATE INDEX IF NOT EXISTS idx_identity_map_contact_id
  ON contact_identity_map (contact_id);

-- RLS --------------------------------------------------------------------------
ALTER TABLE contact_identity_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access on contact_identity_map"
  ON contact_identity_map
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
