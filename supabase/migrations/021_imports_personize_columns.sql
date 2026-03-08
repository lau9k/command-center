-- BAS-42: Add columns to track Personize memorize progress
alter table imports
  add column if not exists processed_count integer not null default 0,
  add column if not exists error_count    integer not null default 0,
  add column if not exists error_details  jsonb   not null default '[]'::jsonb;
