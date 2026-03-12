-- 038_tasks.sql
-- BAS-123: Tasks Module — add "blocked" status and ensure tags column exists.

-- Drop the old CHECK constraint and replace with one that includes "blocked"
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'done', 'blocked'));

-- tags column already exists from 001_core_schema; add index for array queries
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN (tags);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on tasks" ON tasks;
CREATE POLICY "Service role full access on tasks"
  ON tasks FOR ALL
  USING (true)
  WITH CHECK (true);
