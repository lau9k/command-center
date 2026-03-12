-- BAS-152: Recurring Tasks
-- Adds recurrence columns to the tasks table

ALTER TABLE tasks
  ADD COLUMN recurrence_rule TEXT,
  ADD COLUMN recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN is_recurring_template BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quickly finding children of a recurring template
CREATE INDEX idx_tasks_recurrence_parent ON tasks(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;

-- Index for finding active templates
CREATE INDEX idx_tasks_recurring_templates ON tasks(is_recurring_template) WHERE is_recurring_template = TRUE;
