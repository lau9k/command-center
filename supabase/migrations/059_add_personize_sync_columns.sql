-- Add Personize sync tracking columns to dual-written tables
-- Enables monitoring and recovery of sync failures

-- Create enum type for sync status
DO $$ BEGIN
  CREATE TYPE personize_sync_status AS ENUM ('pending', 'synced', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS personize_sync_status personize_sync_status DEFAULT 'pending';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS personize_synced_at TIMESTAMPTZ DEFAULT NULL;

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS personize_sync_status personize_sync_status DEFAULT 'pending';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS personize_synced_at TIMESTAMPTZ DEFAULT NULL;

-- pipeline_items
ALTER TABLE pipeline_items ADD COLUMN IF NOT EXISTS personize_sync_status personize_sync_status DEFAULT 'pending';
ALTER TABLE pipeline_items ADD COLUMN IF NOT EXISTS personize_synced_at TIMESTAMPTZ DEFAULT NULL;

-- content_posts
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS personize_sync_status personize_sync_status DEFAULT 'pending';
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS personize_synced_at TIMESTAMPTZ DEFAULT NULL;

-- meetings
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS personize_sync_status personize_sync_status DEFAULT 'pending';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS personize_synced_at TIMESTAMPTZ DEFAULT NULL;

-- Indexes for filtering by sync status (useful for retry queries)
CREATE INDEX IF NOT EXISTS idx_contacts_personize_sync ON contacts (personize_sync_status) WHERE personize_sync_status != 'synced';
CREATE INDEX IF NOT EXISTS idx_tasks_personize_sync ON tasks (personize_sync_status) WHERE personize_sync_status != 'synced';
CREATE INDEX IF NOT EXISTS idx_pipeline_items_personize_sync ON pipeline_items (personize_sync_status) WHERE personize_sync_status != 'synced';
CREATE INDEX IF NOT EXISTS idx_content_posts_personize_sync ON content_posts (personize_sync_status) WHERE personize_sync_status != 'synced';
CREATE INDEX IF NOT EXISTS idx_meetings_personize_sync ON meetings (personize_sync_status) WHERE personize_sync_status != 'synced';
