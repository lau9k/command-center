-- 026_contacts_tags_score.sql
-- Add tags and score columns to contacts for the Contacts module.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
