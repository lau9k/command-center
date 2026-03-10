-- BAS-91: Community stats cache table for Telegram API responses
-- Stores periodic snapshots of Telegram community metrics to avoid
-- hitting the Telegram API on every page load (max 1 call per 5 min).

CREATE TABLE IF NOT EXISTS community_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_count int NOT NULL DEFAULT 0,
  chat_title text,
  chat_description text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups of the most recent cached row
CREATE INDEX IF NOT EXISTS idx_community_stats_fetched_at
  ON community_stats (fetched_at DESC);

-- RLS: only service role can read/write (no anon access needed)
ALTER TABLE community_stats ENABLE ROW LEVEL SECURITY;
