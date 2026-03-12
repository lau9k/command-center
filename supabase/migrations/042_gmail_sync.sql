-- Gmail sync tables for BAS-136
-- Follows the same pattern as plaid_items / bank_transactions

-- ── Gmail accounts (like plaid_items) ────────────────────────
create table if not exists gmail_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  email_address text not null,
  refresh_token_encrypted text not null,
  history_id    text,          -- Gmail history cursor for incremental sync
  status        text not null default 'active' check (status in ('active','inactive')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists gmail_accounts_email_idx
  on gmail_accounts(email_address);

-- ── Gmail messages ───────────────────────────────────────────
create table if not exists gmail_messages (
  id              uuid primary key default gen_random_uuid(),
  gmail_account_id uuid not null references gmail_accounts(id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id  text not null,
  subject         text,
  snippet         text,
  from_address    text,
  from_name       text,
  to_addresses    jsonb default '[]'::jsonb,
  date            timestamptz,
  label_ids       jsonb default '[]'::jsonb,
  is_unread       boolean default true,
  conversation_id uuid references conversations(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists gmail_messages_msg_id_idx
  on gmail_messages(gmail_message_id);

create index if not exists gmail_messages_thread_idx
  on gmail_messages(gmail_thread_id);

create index if not exists gmail_messages_date_idx
  on gmail_messages(date desc);

create index if not exists gmail_messages_account_idx
  on gmail_messages(gmail_account_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table gmail_accounts enable row level security;
alter table gmail_messages  enable row level security;

-- Users see only their own accounts
create policy "gmail_accounts_user_select" on gmail_accounts
  for select using (auth.uid() = user_id);

create policy "gmail_accounts_user_insert" on gmail_accounts
  for insert with check (auth.uid() = user_id);

create policy "gmail_accounts_user_update" on gmail_accounts
  for update using (auth.uid() = user_id);

-- Users see only messages from their accounts
create policy "gmail_messages_user_select" on gmail_messages
  for select using (
    gmail_account_id in (
      select id from gmail_accounts where user_id = auth.uid()
    )
  );

-- Service role bypass for sync operations
create policy "gmail_accounts_service_all" on gmail_accounts
  for all using (true) with check (true);

create policy "gmail_messages_service_all" on gmail_messages
  for all using (true) with check (true);
