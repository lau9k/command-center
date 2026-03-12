-- Events table for multi-event hackathon support (BAS-127)

create table if not exists events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  project_id        uuid references projects(id) on delete cascade,
  name              text not null,
  date              date,
  location          text,
  status            text not null default 'planning'
    check (status in ('planning', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  budget_target     numeric(12, 2) default 0,
  participant_target integer default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Indexes
create index if not exists idx_events_project_id on events(project_id);
create index if not exists idx_events_status     on events(status);
create index if not exists idx_events_date       on events(date);

-- RLS
alter table events enable row level security;

create policy "Users can view own events"
  on events for select
  using (auth.uid() = user_id);

create policy "Users can insert own events"
  on events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own events"
  on events for update
  using (auth.uid() = user_id);

create policy "Users can delete own events"
  on events for delete
  using (auth.uid() = user_id);

create policy "Service role full access on events"
  on events for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Add event_id FK to sponsors table
alter table sponsors add column if not exists event_id uuid references events(id) on delete set null;
create index if not exists idx_sponsors_event_id on sponsors(event_id);
