-- Email templates table (BAS-143)

create table if not exists email_templates (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  name              text not null,
  subject           text not null default '',
  body              text not null default '',
  variables         text[] not null default '{}',
  category          text not null default 'general'
    check (category in ('general', 'outreach', 'follow_up', 'introduction', 'proposal', 'thank_you')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Indexes
create index if not exists idx_email_templates_user_id   on email_templates(user_id);
create index if not exists idx_email_templates_category  on email_templates(category);
create index if not exists idx_email_templates_name      on email_templates(name);

-- RLS
alter table email_templates enable row level security;

create policy "Users can view own email_templates"
  on email_templates for select
  using (auth.uid() = user_id);

create policy "Users can insert own email_templates"
  on email_templates for insert
  with check (auth.uid() = user_id);

create policy "Users can update own email_templates"
  on email_templates for update
  using (auth.uid() = user_id);

create policy "Users can delete own email_templates"
  on email_templates for delete
  using (auth.uid() = user_id);

create policy "Service role full access on email_templates"
  on email_templates for all
  using (auth.jwt() ->> 'role' = 'service_role');
