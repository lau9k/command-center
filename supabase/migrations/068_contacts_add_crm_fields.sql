-- 068_contacts_add_crm_fields.sql
-- Add role, notes, and phone columns to contacts for CRM ingest.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone TEXT;
