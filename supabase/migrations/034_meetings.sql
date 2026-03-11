-- Meetings table for Granola integration
create table meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  granola_id text unique,
  title text not null,
  attendees jsonb default '[]',
  summary text,
  decisions jsonb default '[]',
  action_items jsonb default '[]',
  new_contacts jsonb default '[]',
  status text not null default 'pending_review' check (status in ('pending_review', 'reviewed', 'dismissed')),
  meeting_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Meeting actions table for tracking post-meeting workflows
create table meeting_actions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  action_type text not null check (action_type in ('follow_up_email', 'create_document', 'make_intro', 'add_contact', 'create_task', 'custom')),
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped')),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Indexes for common queries
create index idx_meetings_status on meetings (status);
create index idx_meetings_user_id on meetings (user_id);
create index idx_meetings_meeting_date on meetings (meeting_date desc);
create index idx_meeting_actions_meeting_id on meeting_actions (meeting_id);
