-- Contact identity map for entity resolution during memory ingestion.
-- Maps contact names, emails, aliases, and Personize record IDs so the
-- memory pipeline can resolve markdown mentions to specific contacts.

create table if not exists contact_identity_map (
  id                uuid primary key default gen_random_uuid(),
  contact_id        uuid not null references contacts(id) on delete cascade,
  personize_record_id text,
  primary_email     text not null,
  alternate_emails  text[] not null default '{}',
  canonical_name    text not null,
  aliases           text[] not null default '{}',
  company_domain    text,
  confidence_score  float not null default 1.0,
  last_verified_at  timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

-- Unique constraint on primary_email to prevent duplicates
create unique index if not exists idx_identity_map_primary_email
  on contact_identity_map (primary_email);

-- GIN indexes for array containment searches on aliases / alternate_emails
create index if not exists idx_identity_map_aliases
  on contact_identity_map using gin (aliases);

create index if not exists idx_identity_map_alternate_emails
  on contact_identity_map using gin (alternate_emails);

-- Fast lookups by contact_id
create index if not exists idx_identity_map_contact_id
  on contact_identity_map (contact_id);

-- Row-level security
alter table contact_identity_map enable row level security;

create policy "Service role has full access to contact_identity_map"
  on contact_identity_map
  for all
  using (true)
  with check (true);
