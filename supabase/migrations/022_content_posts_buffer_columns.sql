-- 022_content_posts_buffer_columns.sql
-- Add Buffer-style columns to content_posts for MEEK content calendar.

-- New columns for Buffer-style post management
ALTER TABLE content_posts
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS engagement JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS buffer_id TEXT;

-- Add 'failed' status option (existing check is implicit — no CHECK constraint on status in 005)
-- The status column has no CHECK constraint, so 'failed' works without ALTER.

-- Service role full access policy (for API routes using service client)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'content_posts'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON content_posts FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- Seed some MEEK content posts for the calendar
INSERT INTO content_posts (project_id, user_id, title, caption, platforms, status, scheduled_at, image_url)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'MEEK Weekly Update #12',
    'Big week for $MEEK! New partnerships announced, bot revenue up 15%, and community growth hitting new highs. Full thread below 🧵',
    '["twitter", "telegram"]'::jsonb,
    'scheduled',
    NOW() + INTERVAL '1 day' + INTERVAL '14 hours',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'Community AMA Announcement',
    'Join us this Friday for a live AMA with the MEEK team! We''ll be discussing the roadmap, token utility, and upcoming features. Drop your questions below!',
    '["twitter", "telegram", "linkedin"]'::jsonb,
    'draft',
    NOW() + INTERVAL '3 days' + INTERVAL '18 hours',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'Bot Revenue Milestone',
    'MEEK Telegram bot just crossed $800/mo in revenue! Here''s how we built a sustainable crypto project with real cashflow.',
    '["twitter", "linkedin"]'::jsonb,
    'published',
    NOW() - INTERVAL '2 days' + INTERVAL '10 hours',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'Token Utility Explainer',
    'What makes $MEEK different? Real utility, real revenue, real community. Here''s our token utility breakdown in one visual.',
    '["instagram", "tiktok"]'::jsonb,
    'scheduled',
    NOW() + INTERVAL '2 days' + INTERVAL '16 hours',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'Partnership Teaser',
    'Something big is coming to the MEEK ecosystem. Stay tuned for a major partnership announcement this week 👀',
    '["twitter", "telegram", "instagram"]'::jsonb,
    'draft',
    NOW() + INTERVAL '5 days' + INTERVAL '12 hours',
    NULL
  );
