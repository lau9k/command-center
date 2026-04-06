-- Add RDS (Relationship Depth Score) columns and computed function to contacts
-- Formula: recency * 0.35 + log_volume * 0.40 + diversity * 0.25 (scaled 0-100)

-- 1. Add new columns
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS last_memory_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS memory_sources TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS relationship_depth_score INT DEFAULT 0;

-- 2. Create PL/pgSQL function to compute RDS
CREATE OR REPLACE FUNCTION compute_rds(
  mem_count INT,
  last_at TIMESTAMPTZ,
  sources TEXT[]
) RETURNS INT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  recency_score NUMERIC;
  volume_score NUMERIC;
  diversity_score NUMERIC;
  days_since NUMERIC;
  source_count INT;
  total NUMERIC;
BEGIN
  -- Handle null/zero case
  IF mem_count IS NULL OR mem_count = 0 THEN
    RETURN 0;
  END IF;

  -- Recency: decay over 180 days (35%)
  IF last_at IS NULL THEN
    recency_score := 0;
  ELSE
    days_since := EXTRACT(EPOCH FROM (NOW() - last_at)) / 86400.0;
    IF days_since < 0 THEN days_since := 0; END IF;
    recency_score := GREATEST(0, 1.0 - (days_since / 180.0));
  END IF;

  -- Volume: log-scale capped at 50 memories (40%)
  volume_score := LEAST(1.0, LN(1 + mem_count) / LN(1 + 50));

  -- Diversity: out of 4 source types (25%)
  source_count := COALESCE(array_length(sources, 1), 0);
  diversity_score := LEAST(1.0, source_count / 4.0);

  -- Weighted sum scaled to 0-100
  total := (recency_score * 0.35 + volume_score * 0.40 + diversity_score * 0.25) * 100;

  RETURN LEAST(100, GREATEST(0, ROUND(total)::INT));
END;
$$;

-- 3. Create trigger function to recalculate RDS on contact update
CREATE OR REPLACE FUNCTION trg_recompute_rds()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  -- Recalculate when memory-related columns change
  IF (TG_OP = 'INSERT') OR
     (OLD.memory_count IS DISTINCT FROM NEW.memory_count) OR
     (OLD.last_memory_at IS DISTINCT FROM NEW.last_memory_at) OR
     (OLD.memory_sources IS DISTINCT FROM NEW.memory_sources) THEN
    NEW.relationship_depth_score := compute_rds(
      COALESCE(NEW.memory_count, 0),
      NEW.last_memory_at,
      COALESCE(NEW.memory_sources, '{}')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Create trigger
DROP TRIGGER IF EXISTS contacts_recompute_rds ON contacts;
CREATE TRIGGER contacts_recompute_rds
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION trg_recompute_rds();

-- 5. Backfill existing contacts (score will be 0 for those with no memories)
UPDATE contacts
SET relationship_depth_score = compute_rds(
  COALESCE(memory_count, 0),
  last_memory_at,
  COALESCE(memory_sources, '{}')
);

-- 6. Index for sorting
CREATE INDEX IF NOT EXISTS idx_contacts_rds ON contacts (relationship_depth_score DESC);
