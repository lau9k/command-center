-- Clean up orphaned contact_id references before adding constraints
UPDATE tasks
SET contact_id = NULL
WHERE contact_id IS NOT NULL
  AND contact_id NOT IN (SELECT id FROM contacts);

UPDATE conversations
SET contact_id = NULL
WHERE contact_id IS NOT NULL
  AND contact_id NOT IN (SELECT id FROM contacts);

-- Add ON DELETE SET NULL foreign key constraints
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_contact_id_fkey,
  ADD CONSTRAINT tasks_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id)
    ON DELETE SET NULL;

ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_contact_id_fkey,
  ADD CONSTRAINT conversations_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id)
    ON DELETE SET NULL;
