-- Saved views with smart filters (BAS-154)

create table if not exists saved_views (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  name            text not null,
  entity_type     text not null
    check (entity_type in ('contacts', 'tasks', 'pipeline_items', 'content_posts', 'transactions', 'sponsors')),
  filters         jsonb not null default '[]',
  sort_by         text,
  sort_direction  text not null default 'asc'
    check (sort_direction in ('asc', 'desc')),
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes
create index if not exists idx_saved_views_user_id      on saved_views(user_id);
create index if not exists idx_saved_views_entity_type  on saved_views(user_id, entity_type);
create index if not exists idx_saved_views_default      on saved_views(user_id, entity_type, is_default)
  where is_default = true;

-- RLS
alter table saved_views enable row level security;

create policy "Users can view own saved_views"
  on saved_views for select
  using (auth.uid() = user_id);

create policy "Users can insert own saved_views"
  on saved_views for insert
  with check (auth.uid() = user_id);

create policy "Users can update own saved_views"
  on saved_views for update
  using (auth.uid() = user_id);

create policy "Users can delete own saved_views"
  on saved_views for delete
  using (auth.uid() = user_id);

create policy "Service role full access on saved_views"
  on saved_views for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Ensure only one default view per entity_type per user
create or replace function ensure_single_default_view()
returns trigger as $$
begin
  if NEW.is_default = true then
    update saved_views
    set is_default = false, updated_at = now()
    where user_id = NEW.user_id
      and entity_type = NEW.entity_type
      and id != NEW.id
      and is_default = true;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_ensure_single_default_view
  before insert or update on saved_views
  for each row
  execute function ensure_single_default_view();
