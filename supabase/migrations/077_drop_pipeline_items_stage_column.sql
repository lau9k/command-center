-- Drop the unused `stage` text column from pipeline_items.
-- The pipeline board uses `stage_id` (FK to pipeline_stages) for grouping.
-- The `stage` text column is NULL for all rows and never referenced in code.

-- Drop indexes that reference the dead column
DROP INDEX IF EXISTS idx_pipeline_items_project_stage_updated;
DROP INDEX IF EXISTS idx_pipeline_items_stage;

-- Drop the column
ALTER TABLE pipeline_items DROP COLUMN IF EXISTS stage;
