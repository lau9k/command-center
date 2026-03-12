-- Onboarding checklist state (per user)
create table if not exists public.onboarding_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  dismissed_at timestamptz,
  welcome_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.onboarding_state enable row level security;

create policy "Users can read own onboarding state"
  on public.onboarding_state for select
  using (auth.uid() = user_id);

create policy "Users can insert own onboarding state"
  on public.onboarding_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update own onboarding state"
  on public.onboarding_state for update
  using (auth.uid() = user_id);
