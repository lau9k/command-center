-- 004_notifications_task_feedback_memory_stats.sql
-- Add notifications, task_feedback, and memory_stats tables.

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  type        TEXT NOT NULL
                CHECK (type IN ('task', 'alert', 'info', 'signal')),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  source      TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  action_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread
  ON notifications (user_id, read)
  WHERE read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notifications"
  ON notifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable Supabase Realtime on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- TASK_FEEDBACK
-- ============================================================
CREATE TABLE task_feedback (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id             UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action              TEXT NOT NULL
                        CHECK (action IN ('approved', 'rejected', 'edited')),
  original_suggestion JSONB,
  user_correction     TEXT,
  reason              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE task_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: users can manage task_feedback for tasks they own
CREATE POLICY "Users can manage feedback on their own tasks"
  ON task_feedback
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_feedback.task_id
        AND tasks.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_feedback.task_id
        AND tasks.user_id = auth.uid()
    )
  );

-- ============================================================
-- MEMORY_STATS
-- ============================================================
CREATE TABLE memory_stats (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  memory_type    TEXT NOT NULL,
  count          INTEGER NOT NULL DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  metadata       JSONB,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX memory_stats_project_type
  ON memory_stats (project_id, memory_type);

ALTER TABLE memory_stats ENABLE ROW LEVEL SECURITY;

-- Policy: users can manage memory_stats for projects they own
CREATE POLICY "Users can manage memory stats for their own projects"
  ON memory_stats
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = memory_stats.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = memory_stats.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- ============================================================
-- UPDATED_AT TRIGGER (reuse existing function)
-- ============================================================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON memory_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
