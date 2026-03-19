-- Add outreach status tracking columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS outreach_status TEXT DEFAULT 'queued'
  CHECK (outreach_status IN ('queued', 'sent', 'replied', 'no_response', 'skipped'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS response_notes TEXT;

-- Index for filtering outreach tasks by status
CREATE INDEX IF NOT EXISTS idx_tasks_outreach_status ON tasks (outreach_status)
  WHERE outreach_status IS NOT NULL;
