-- ============================================================
-- 053: Performance indexes for common query patterns
-- All use IF NOT EXISTS to be safely re-runnable.
-- ============================================================

-- ---- contacts ----
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_contacts_project_id ON contacts(project_id);

-- ---- tasks ----
-- idx_tasks_status already exists (027_tasks.sql), skip.
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- ---- content_posts ----
-- Column is "scheduled_for" not "scheduled_at"
CREATE INDEX IF NOT EXISTS idx_content_posts_scheduled_for ON content_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_posts_platform ON content_posts(platform);

-- ---- pipeline_items (deals equivalent) ----
CREATE INDEX IF NOT EXISTS idx_pipeline_items_stage ON pipeline_items(stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_items_project_id ON pipeline_items(project_id);

-- ---- transactions ----
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- ---- notifications ----
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
