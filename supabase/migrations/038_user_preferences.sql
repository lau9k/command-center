-- User preferences for settings page (BAS-124)
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  default_project_filter uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- RLS
alter table public.user_preferences enable row level security;

create policy "Users can view their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);

-- Service role bypass
create policy "Service role full access on user_preferences"
  on public.user_preferences for all
  using (true)
  with check (true);

-- Auto-update updated_at
create trigger set_updated_at_user_preferences
  before update on public.user_preferences
  for each row
  execute function public.set_updated_at();

-- Index
create index if not exists idx_user_preferences_user_id on public.user_preferences(user_id);
