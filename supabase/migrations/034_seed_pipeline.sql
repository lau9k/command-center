-- Seed default pipeline stages for all existing pipelines of type 'sales'
-- that have no stages yet. Also creates a default sales pipeline for projects
-- that don't have one.
--
-- Stage colors use the design-token palette:
--   Lead        = #3B82F6 (blue)
--   Contacted   = #A855F7 (purple)
--   Demo Sched  = #F97316 (orange)
--   Proposal    = #EAB308 (yellow)
--   Negotiation = #F97316 (orange)
--   Won         = #22C55E (green)
--   Lost        = #6B7280 (gray)

-- For each project that has no sales pipeline, create one
INSERT INTO pipelines (project_id, user_id, name, type, stage_order)
SELECT
  p.id,
  p.user_id,
  'Sales Pipeline',
  'sales',
  '[]'::jsonb
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM pipelines pl
  WHERE pl.project_id = p.id AND pl.type = 'sales'
)
ON CONFLICT DO NOTHING;

-- For each sales pipeline that has no stages, seed the defaults
INSERT INTO pipeline_stages (pipeline_id, project_id, user_id, name, slug, sort_order, color)
SELECT
  pl.id,
  pl.project_id,
  pl.user_id,
  s.name,
  s.slug,
  s.sort_order,
  s.color
FROM pipelines pl
CROSS JOIN (
  VALUES
    ('Lead',           'lead',           0, '#3B82F6'),
    ('Contacted',      'contacted',      1, '#A855F7'),
    ('Demo Scheduled', 'demo-scheduled', 2, '#F97316'),
    ('Proposal Sent',  'proposal-sent',  3, '#EAB308'),
    ('Negotiation',    'negotiation',    4, '#F97316'),
    ('Won',            'won',            5, '#22C55E'),
    ('Lost',           'lost',           6, '#6B7280')
) AS s(name, slug, sort_order, color)
WHERE pl.type = 'sales'
  AND NOT EXISTS (
    SELECT 1 FROM pipeline_stages ps
    WHERE ps.pipeline_id = pl.id
  )
ON CONFLICT DO NOTHING;
