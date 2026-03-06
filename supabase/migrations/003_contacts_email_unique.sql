-- 003_contacts_email_unique.sql
-- Add a unique partial index on (project_id, email) for contacts
-- to support duplicate detection during CSV import (upsert on email per project).

CREATE UNIQUE INDEX contacts_project_email_unique
  ON contacts (project_id, email)
  WHERE email IS NOT NULL;
