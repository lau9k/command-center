-- Backfill all existing content_posts with NULL platform to 'linkedin'
UPDATE content_posts SET platform = 'linkedin' WHERE platform IS NULL;

-- Set a NOT NULL default for future inserts
ALTER TABLE content_posts ALTER COLUMN platform SET DEFAULT 'linkedin';
