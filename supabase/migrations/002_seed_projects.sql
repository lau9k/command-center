-- 002_seed_projects.sql
-- Seed the projects table with Lautaro's real projects.
-- user_id is set to '00000000-0000-0000-0000-000000000000' as a placeholder;
-- update it to the actual auth.uid() after first sign-in.

INSERT INTO projects (user_id, name, slug, status, phase) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Personize',      'personize',      'active',     'priority-1'),
  ('00000000-0000-0000-0000-000000000000', 'MEEK',           'meek',           'active',     'priority-2'),
  ('00000000-0000-0000-0000-000000000000', 'Hackathons',     'hackathons',     'active',     'priority-3'),
  ('00000000-0000-0000-0000-000000000000', 'Infrastructure', 'infrastructure', 'active',     'priority-4'),
  ('00000000-0000-0000-0000-000000000000', 'Eventium',       'eventium',       'active',     'priority-5'),
  ('00000000-0000-0000-0000-000000000000', 'Telco',          'telco',          'backburner', 'priority-6');
