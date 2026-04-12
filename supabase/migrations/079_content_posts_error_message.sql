-- 079_content_posts_error_message.sql
-- Add error_message column to content_posts for tracking failure reasons
-- (e.g. orphan posts that were scheduled but never sent to Late.so).

ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS error_message TEXT;
