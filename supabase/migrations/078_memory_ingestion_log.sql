-- Memory ingestion log for Personize dedup tracking
-- Tracks every memorize call so we can content-hash-deduplicate before sending.

create table memory_ingestion_log (
  id               uuid        primary key default gen_random_uuid(),
  contact_id       uuid        references contacts(id) on delete set null,
  contact_email    text,
  source_type      text        not null
    check (source_type in ('decisions', 'session_note', 'call_transcript', 'intake_file', 'manual')),
  source_ref       text        not null,
  content_hash     text        not null,
  personize_event_id text,
  status           text        not null default 'pending'
    check (status in ('pending', 'sent', 'confirmed', 'failed')),
  created_at       timestamptz not null default now(),
  payload_preview  text
);

-- Unique constraint on content_hash for dedup
create unique index idx_memory_ingestion_log_content_hash
  on memory_ingestion_log (content_hash);

-- Lookup by contact email
create index idx_memory_ingestion_log_contact_email
  on memory_ingestion_log (contact_email);

-- Filter by source type
create index idx_memory_ingestion_log_source_type
  on memory_ingestion_log (source_type);
