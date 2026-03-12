-- 042_seed_projects.sql
-- Add description and color columns to projects table,
-- update existing projects with metadata, and seed sample tasks for Telco + Eventium.

-- ============================================================
-- 1. Add missing columns
-- ============================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS color TEXT;

-- ============================================================
-- 2. Update existing projects with descriptions and colors
-- ============================================================
UPDATE projects SET
  description = 'AI-powered contact enrichment and outreach platform — priority-1 revenue product',
  color = '#3B82F6'
WHERE slug = 'personize' AND description IS NULL;

UPDATE projects SET
  description = 'Web3 community music event brand — community building and sponsorships',
  color = '#F97316'
WHERE slug = 'meek' AND description IS NULL;

UPDATE projects SET
  description = 'Hackathon event management — organizing and running developer hackathons',
  color = '#EAB308'
WHERE slug = 'hackathons' AND description IS NULL;

UPDATE projects SET
  description = 'Internal tooling and infrastructure — CI/CD, dashboards, DevOps',
  color = '#6B7280'
WHERE slug = 'infrastructure' AND description IS NULL;

UPDATE projects SET
  description = 'Fan experience and use case management platform — manages teams and use cases built from hackathon outputs',
  color = '#8b5cf6',
  status = 'paused'
WHERE slug = 'eventium' AND description IS NULL;

UPDATE projects SET
  description = 'Canadian telecom advocacy platform — pre-launch validation for consumer telecom transparency tools',
  color = '#10b981',
  status = 'active'
WHERE slug = 'telco' AND description IS NULL;

-- ============================================================
-- 3. Seed sample tasks for Telco
-- ============================================================
INSERT INTO tasks (project_id, user_id, title, status, priority, due_date, assignee)
SELECT p.id, p.user_id, t.title, t.status, t.priority, t.due_date::date, t.assignee
FROM projects p,
(VALUES
  ('Research CRTC complaint filing process', 'todo', 'high', (CURRENT_DATE + INTERVAL '5 days')::text, 'Cyrus'),
  ('Build telecom plan comparison scraper MVP', 'in_progress', 'critical', (CURRENT_DATE + INTERVAL '3 days')::text, 'Cyrus'),
  ('Draft landing page copy for consumer advocacy tool', 'todo', 'medium', (CURRENT_DATE + INTERVAL '7 days')::text, NULL),
  ('Validate market size with 10 user interviews', 'todo', 'high', (CURRENT_DATE + INTERVAL '10 days')::text, 'Cyrus')
) AS t(title, status, priority, due_date, assignee)
WHERE p.slug = 'telco'
AND NOT EXISTS (
  SELECT 1 FROM tasks tk WHERE tk.project_id = p.id AND tk.title = t.title
);

-- ============================================================
-- 4. Seed sample tasks for Eventium
-- ============================================================
INSERT INTO tasks (project_id, user_id, title, status, priority, due_date, assignee)
SELECT p.id, p.user_id, t.title, t.status, t.priority, t.due_date::date, t.assignee
FROM projects p,
(VALUES
  ('Configure Stripe webhooks for ticket payments', 'todo', 'high', (CURRENT_DATE + INTERVAL '6 days')::text, 'Cyrus'),
  ('Design use case submission form UI', 'in_progress', 'medium', (CURRENT_DATE + INTERVAL '4 days')::text, 'Cyrus'),
  ('Set up team management CRUD endpoints', 'todo', 'high', (CURRENT_DATE + INTERVAL '8 days')::text, 'Cyrus'),
  ('Write launch blog post draft', 'done', 'medium', (CURRENT_DATE - INTERVAL '1 day')::text, 'Cyrus')
) AS t(title, status, priority, due_date, assignee)
WHERE p.slug = 'eventium'
AND NOT EXISTS (
  SELECT 1 FROM tasks tk WHERE tk.project_id = p.id AND tk.title = t.title
);
