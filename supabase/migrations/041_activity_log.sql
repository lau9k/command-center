-- Activity log table for audit trail
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,          -- 'created' | 'updated' | 'deleted' | 'ingested' | 'synced'
  entity_type text not null,     -- 'contact' | 'task' | 'conversation' | 'sponsor' | 'transaction' | 'content_post'
  entity_id uuid,                -- FK to the relevant record
  entity_name text,              -- Human-readable name for display
  source text default 'manual',  -- 'manual' | 'webhook' | 'n8n' | 'granola' | 'plaid' | 'personize'
  metadata jsonb default '{}',   -- Extra context (changed fields, old values, etc.)
  created_at timestamptz default now()
);

-- Indexes
create index idx_activity_log_created_at on activity_log (created_at desc);
create index idx_activity_log_entity_type on activity_log (entity_type);
create index idx_activity_log_source on activity_log (source);

-- RLS
alter table activity_log enable row level security;

create policy "Authenticated users can read activity_log"
  on activity_log for select
  to authenticated
  using (true);

create policy "Authenticated users can insert activity_log"
  on activity_log for insert
  to authenticated
  with check (true);
