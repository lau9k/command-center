-- 055_notifications.sql
-- Ensure notifications table exists (may have been created via SQL Editor
-- but not tracked in migrations).

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID,
  title       TEXT NOT NULL,
  message     TEXT,
  type        TEXT DEFAULT 'info',
  read        BOOLEAN DEFAULT false,
  href        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
