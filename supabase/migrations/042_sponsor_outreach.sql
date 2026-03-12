-- Sponsor outreach tracking table
create table if not exists sponsor_outreach (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors(id) on delete cascade,
  type text not null,                -- 'email' | 'call' | 'meeting' | 'linkedin' | 'other'
  subject text,                      -- email subject or meeting title
  notes text,                        -- what was discussed/sent
  status text default 'sent',        -- 'sent' | 'replied' | 'no_response' | 'follow_up_needed'
  contacted_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_sponsor_outreach_sponsor_id on sponsor_outreach(sponsor_id);
create index if not exists idx_sponsor_outreach_contacted_at on sponsor_outreach(contacted_at desc);

-- RLS
alter table sponsor_outreach enable row level security;

create policy "Allow all read access on sponsor_outreach"
  on sponsor_outreach for select
  using (true);

create policy "Allow all write access on sponsor_outreach"
  on sponsor_outreach for insert
  with check (true);

create policy "Allow all update access on sponsor_outreach"
  on sponsor_outreach for update
  using (true);

create policy "Allow all delete access on sponsor_outreach"
  on sponsor_outreach for delete
  using (true);
