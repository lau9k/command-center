-- BAS-41: Imports table for CSV import storage
create table if not exists imports (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  record_count integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'processing', 'complete', 'failed')),
  mapped_data jsonb not null default '[]'::jsonb,
  field_mapping jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
