-- Seed: Healthcare AI Hackathon event + link existing sponsors (BAS-127)

-- Insert the event under the Hackathons project
insert into events (id, project_id, name, date, location, status, budget_target, participant_target)
select
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  p.id,
  'Healthcare AI Hackathon',
  '2026-03-27',
  'University of Victoria',
  'confirmed',
  50000,
  200
from projects p
where p.slug = 'hackathons'
on conflict (id) do nothing;

-- Link all existing sponsors to this event
update sponsors
set event_id = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
where event_id is null;
