-- Contacts table for people directory (BAS-121)

create table if not exists contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  company         text,
  role            text,
  source          text not null default 'manual'
    check (source in ('manual', 'referral', 'website', 'linkedin', 'other')),
  status          text not null default 'active'
    check (status in ('active', 'inactive', 'lead', 'customer')),
  tags            text[] not null default '{}',
  score           integer not null default 0,
  notes           text,
  project_id      uuid references projects(id) on delete set null,
  last_contact_date timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes
create index if not exists idx_contacts_user_id   on contacts(user_id);
create index if not exists idx_contacts_status     on contacts(status);
create index if not exists idx_contacts_source     on contacts(source);
create index if not exists idx_contacts_project_id on contacts(project_id);
create index if not exists idx_contacts_name       on contacts(name);

-- RLS
alter table contacts enable row level security;

create policy "Users can view own contacts"
  on contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert own contacts"
  on contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contacts"
  on contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete own contacts"
  on contacts for delete
  using (auth.uid() = user_id);

-- Service role bypass (matches pattern from other tables)
create policy "Service role full access on contacts"
  on contacts for all
  using (auth.jwt() ->> 'role' = 'service_role');
