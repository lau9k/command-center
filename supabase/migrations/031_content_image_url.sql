-- 031_content_image_url.sql
-- Ensure image_url column exists on content_posts (originally added in 022).
-- This migration is idempotent — safe to re-run.

ALTER TABLE content_posts
  ADD COLUMN IF NOT EXISTS image_url TEXT;
