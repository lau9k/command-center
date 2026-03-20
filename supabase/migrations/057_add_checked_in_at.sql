-- Add checked_in_at column to contacts table for event check-in tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ DEFAULT NULL;
