-- Content Items table for AI-generated content review pipeline
-- Used by the content review page for human-in-the-loop approval + Late.so publishing

create table content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  title text,
  body text not null,
  platform text not null check (platform in ('twitter', 'telegram', 'linkedin', 'bluesky', 'instagram', 'facebook', 'reddit')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'failed')),
  brand text not null default 'meek' check (brand in ('meek', 'personize', 'buildervault', 'telco', 'personal')),
  narrative_arc_chapter text,
  tone text,
  scheduled_for timestamptz,
  published_at timestamptz,
  late_so_id text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for common queries
create index idx_content_items_status on content_items (status);
create index idx_content_items_platform on content_items (platform);
create index idx_content_items_brand on content_items (brand);
create index idx_content_items_scheduled_for on content_items (scheduled_for);
create index idx_content_items_created_at on content_items (created_at desc);

-- RLS
alter table content_items enable row level security;

create policy "Users can view own content items"
  on content_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own content items"
  on content_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own content items"
  on content_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own content items"
  on content_items for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at trigger
create or replace function update_content_items_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger content_items_updated_at
  before update on content_items
  for each row
  execute function update_content_items_updated_at();
