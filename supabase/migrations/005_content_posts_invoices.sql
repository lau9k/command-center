-- 005_content_posts_invoices.sql
-- Add content_posts and invoices tables for dashboard KPI tracking.

-- ============================================================
-- CONTENT_POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS content_posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  title         TEXT,
  body          TEXT,
  platform      TEXT,
  type          TEXT DEFAULT 'post',
  status        TEXT DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  late_post_id  TEXT,
  media_urls    TEXT[],
  metrics       JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own content posts"
  ON content_posts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON content_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INVOICES
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  title       TEXT NOT NULL,
  amount      NUMERIC NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'sent', 'overdue', 'paid', 'cancelled')),
  due_date    DATE,
  recipient   TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own invoices"
  ON invoices
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
