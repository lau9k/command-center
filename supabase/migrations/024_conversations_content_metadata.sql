-- 024_conversations_content_metadata.sql
-- Add conversations table and metadata column to content_posts for BAS-48 imports.

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  contact_id      UUID REFERENCES contacts(id) ON DELETE SET NULL,
  summary         TEXT,
  channel         TEXT,
  last_message_at TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversations"
  ON conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ADD METADATA TO CONTENT_POSTS
-- ============================================================
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
