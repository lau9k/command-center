-- GitHub stats cache table
-- Stores cached GitHub API responses to avoid rate-limiting.
-- Max 1 API call per 10 minutes; older rows kept for historical comparison.

CREATE TABLE github_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_prs int NOT NULL DEFAULT 0,
  merged_prs int NOT NULL DEFAULT 0,
  open_prs int NOT NULL DEFAULT 0,
  merge_rate int NOT NULL DEFAULT 0,
  last_commit_sha text,
  last_commit_message text,
  last_commit_date timestamptz,
  build_status text NOT NULL DEFAULT 'unknown',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup for most recent cached row
CREATE INDEX idx_github_stats_fetched_at ON github_stats (fetched_at DESC);

-- RLS: only service role can read/write
ALTER TABLE github_stats ENABLE ROW LEVEL SECURITY;
