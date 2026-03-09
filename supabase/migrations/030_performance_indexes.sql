-- BAS-75: Performance Optimization — Composite Indexes, Materialized Views, Refresh Function
-- ============================================================================

-- 1. Composite indexes for common query patterns
-- ============================================================================

-- contacts: filter by project + status, order by created_at
CREATE INDEX IF NOT EXISTS idx_contacts_project_status_created
  ON contacts (project_id, status, created_at DESC);

-- tasks: filter by project + priority + status, order by due_date
CREATE INDEX IF NOT EXISTS idx_tasks_project_priority_status_due
  ON tasks (project_id, priority, status, due_date ASC NULLS LAST);

-- content_posts: filter by project + status, order by scheduled_date
CREATE INDEX IF NOT EXISTS idx_content_posts_project_status_scheduled
  ON content_posts (project_id, status, scheduled_for DESC NULLS LAST);

-- pipeline_items: filter by project + stage, order by updated_at
CREATE INDEX IF NOT EXISTS idx_pipeline_items_project_stage_updated
  ON pipeline_items (project_id, stage, updated_at DESC);

-- transactions: filter by wallet + date + category
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date_category
  ON transactions (wallet_id, date DESC, category);


-- 2. Materialized views
-- ============================================================================

-- Pipeline summary: stage counts + total value per stage
CREATE MATERIALIZED VIEW IF NOT EXISTS pipeline_summary AS
SELECT
  project_id,
  stage,
  COUNT(*)::int AS item_count,
  COALESCE(SUM(value), 0) AS total_value
FROM pipeline_items
GROUP BY project_id, stage;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pipeline_summary_project_stage
  ON pipeline_summary (project_id, stage);


-- Community daily stats: daily snapshot of Telegram metrics
-- Stores aggregated daily stats; rows inserted by external webhook/cron
CREATE MATERIALIZED VIEW IF NOT EXISTS community_daily_stats AS
SELECT
  DATE(created_at) AS stat_date,
  COUNT(*)::int AS new_members,
  (SELECT COUNT(*)::int FROM contacts WHERE source = 'telegram') AS total_members
FROM contacts
WHERE source = 'telegram'
GROUP BY DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_daily_stats_date
  ON community_daily_stats (stat_date);


-- 3. Refresh function callable via RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY pipeline_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY community_daily_stats;
END;
$$;
