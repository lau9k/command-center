-- BAS-160: Add external_id columns for webhook ingestion upsert dedup

-- Conversations: external_id = Gmail thread ID or Slack channel ID
alter table conversations
  add column if not exists external_id text;

create unique index if not exists idx_conversations_external_id
  on conversations(external_id) where external_id is not null;

-- Tasks: external_id for dedup from external systems
alter table tasks
  add column if not exists external_id text;

create unique index if not exists idx_tasks_external_id
  on tasks(external_id) where external_id is not null;

-- Transactions: external_id = Plaid transaction ID
alter table transactions
  add column if not exists external_id text;

create unique index if not exists idx_transactions_external_id
  on transactions(external_id) where external_id is not null;
