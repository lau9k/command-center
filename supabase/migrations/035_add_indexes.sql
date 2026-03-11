-- ============================================================
-- BAS-98: Composite indexes for high-traffic query patterns
-- ============================================================

-- tasks: user-scoped filtering by status + priority (task list page)
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_priority
  ON tasks (user_id, status, priority);

-- pipeline_items: kanban board loading by pipeline + stage
CREATE INDEX IF NOT EXISTS idx_pipeline_items_pipeline_stage_updated
  ON pipeline_items (pipeline_id, stage_id, updated_at DESC);

-- contacts: user-scoped list sorted by last update
CREATE INDEX IF NOT EXISTS idx_contacts_user_updated
  ON contacts (user_id, updated_at DESC);

-- conversations: message threading (ordered messages within a conversation)
CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message
  ON conversations (user_id, last_message_at DESC);

-- transactions: user-scoped financial queries by date + category
-- (fixes broken idx_transactions_wallet_date_category from 030 which
-- referenced non-existent wallet_id column)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_category
  ON transactions (user_id, date DESC, category);
