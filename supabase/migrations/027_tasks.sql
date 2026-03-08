-- 027_tasks.sql
-- Allow tasks without a project (for quick-add) and add useful indexes.

-- Make project_id nullable so tasks can be created via quick-add without a project
ALTER TABLE tasks ALTER COLUMN project_id DROP NOT NULL;

-- Index for default sort: priority then due_date
CREATE INDEX IF NOT EXISTS idx_tasks_priority_due ON tasks (priority, due_date);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
