-- 025_fix_contacts_null_project_id.sql
-- Fix imported contacts that have NULL project_id.
-- Assigns them to the Personize project (looked up by slug).

UPDATE contacts
SET project_id = (SELECT id FROM projects WHERE slug = 'personize' LIMIT 1)
WHERE project_id IS NULL;
