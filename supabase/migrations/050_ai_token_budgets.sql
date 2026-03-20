-- Token budget tables for AI feature cost control
-- BAS-254

create table if not exists ai_token_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  daily_limit int not null default 50000,
  used_tokens int not null default 0,
  hard_cap int not null default 75000,
  created_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists ai_feature_weights (
  feature text primary key,
  weight int not null,
  min_reserve int not null default 0
);

-- Seed feature weights (must total 100)
insert into ai_feature_weights (feature, weight, min_reserve) values
  ('daily_brief',      20, 0),
  ('task_priorities',  30, 0),
  ('contact_summary',  30, 0),
  ('pipeline_summary', 10, 0),
  ('suggestions',      10, 0)
on conflict (feature) do nothing;
