-- Add memorized_at and personize_record_id columns to contacts table
-- for eventual-consistency Personize memory sync pattern.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS memorized_at timestamptz DEFAULT NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS personize_record_id text DEFAULT NULL;

-- Index for efficient lookup of unmemorized contacts
CREATE INDEX IF NOT EXISTS idx_contacts_memorized_at_null
  ON contacts (created_at ASC)
  WHERE memorized_at IS NULL;
