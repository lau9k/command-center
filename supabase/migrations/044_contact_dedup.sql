-- BAS-151: Contact Deduplication + Merge
-- Add deleted_at for soft-delete and merged_into_id for merge tracking

alter table contacts
  add column if not exists deleted_at timestamptz,
  add column if not exists merged_into_id uuid references contacts(id) on delete set null;

create index if not exists idx_contacts_deleted_at on contacts(deleted_at) where deleted_at is null;
create index if not exists idx_contacts_merged_into on contacts(merged_into_id) where merged_into_id is not null;
create index if not exists idx_contacts_email_lower on contacts(lower(email)) where email is not null;
