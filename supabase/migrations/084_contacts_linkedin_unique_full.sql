-- BAS-442: Convert partial unique index to full UNIQUE constraint
-- PostgREST cannot infer partial indexes for ON CONFLICT, causing 42P10 errors
-- on supabase-js .upsert({ onConflict: 'linkedin_url' }) calls.
-- NULLs remain distinct under a standard UNIQUE constraint in Postgres,
-- so behavior matches the old partial index semantics.

BEGIN;

-- Guard: confirm BAS-441 dedup completed
DO $$
DECLARE dup_count int;
BEGIN
  SELECT count(*) INTO dup_count FROM (
    SELECT linkedin_url FROM contacts
    WHERE linkedin_url IS NOT NULL
    GROUP BY linkedin_url HAVING count(*) > 1
  ) s;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Cannot add UNIQUE: % duplicate linkedin_url groups still exist. Re-run BAS-441 dedupe.', dup_count;
  END IF;
END $$;

-- Drop partial index from BAS-441 (PostgREST can't infer it for ON CONFLICT)
DROP INDEX IF EXISTS contacts_linkedin_url_unique;

-- Add full UNIQUE constraint (NULLs are distinct by default in Postgres,
-- so this matches the partial index semantics at the row level but IS inferable)
ALTER TABLE contacts
  ADD CONSTRAINT contacts_linkedin_url_key UNIQUE (linkedin_url);

COMMIT;
