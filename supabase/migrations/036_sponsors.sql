-- Sponsors table for tracking sponsor outreach pipeline (BAS-119)

create table if not exists sponsors (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  contact_name text,
  contact_email text,
  company_url text,
  tier        text not null default 'silver'
    check (tier in ('bronze', 'silver', 'gold', 'platinum', 'title')),
  status      text not null default 'not_contacted'
    check (status in ('not_contacted', 'contacted', 'negotiating', 'confirmed', 'declined')),
  amount      numeric(12, 2) default 0,
  currency    text not null default 'USD',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Indexes
create index if not exists idx_sponsors_user_id on sponsors(user_id);
create index if not exists idx_sponsors_status  on sponsors(status);
create index if not exists idx_sponsors_tier    on sponsors(tier);

-- RLS
alter table sponsors enable row level security;

create policy "Users can view own sponsors"
  on sponsors for select
  using (auth.uid() = user_id);

create policy "Users can insert own sponsors"
  on sponsors for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sponsors"
  on sponsors for update
  using (auth.uid() = user_id);

create policy "Users can delete own sponsors"
  on sponsors for delete
  using (auth.uid() = user_id);

-- Service role bypass (matches pattern from other tables)
create policy "Service role full access on sponsors"
  on sponsors for all
  using (auth.jwt() ->> 'role' = 'service_role');
