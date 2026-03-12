-- ─── Memory Stats – add columns for personize sync-stats ────────────────────
-- Extends the memory_stats table (created in 004) with additional columns
-- needed by lib/personize/sync-stats.ts.

ALTER TABLE memory_stats ADD COLUMN IF NOT EXISTS collection_id   text;
ALTER TABLE memory_stats ADD COLUMN IF NOT EXISTS collection_name text;
ALTER TABLE memory_stats ADD COLUMN IF NOT EXISTS record_count    integer DEFAULT 0;
ALTER TABLE memory_stats ADD COLUMN IF NOT EXISTS created_at      timestamptz DEFAULT now();
ALTER TABLE memory_stats ADD COLUMN IF NOT EXISTS user_id         uuid REFERENCES auth.users(id);

-- Unique constraint for collection-level upserts per user
CREATE UNIQUE INDEX IF NOT EXISTS memory_stats_collection_user
  ON memory_stats(collection_id, user_id);

-- RLS policy for direct user_id-based access
CREATE POLICY "Users can manage their own memory_stats"
  ON memory_stats
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
