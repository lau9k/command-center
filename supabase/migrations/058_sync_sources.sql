-- sync_sources: tracks integration health per data source
CREATE TABLE IF NOT EXISTS sync_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL UNIQUE,
  display_name text NOT NULL,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  error_count_24h int NOT NULL DEFAULT 0,
  backoff_until timestamptz,
  status text NOT NULL DEFAULT 'unknown'
    CHECK (status IN ('healthy', 'degraded', 'failing', 'unknown')),
  sync_frequency_minutes int,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed the 6 core data sources
INSERT INTO sync_sources (source, display_name, status) VALUES
  ('linkedin', 'LinkedIn', 'unknown'),
  ('gmail', 'Gmail', 'unknown'),
  ('granola', 'Granola', 'unknown'),
  ('github', 'GitHub', 'unknown'),
  ('telegram', 'Telegram', 'unknown'),
  ('personize', 'Personize', 'unknown')
ON CONFLICT (source) DO NOTHING;
