-- Automatically reload the PostgREST schema cache after any DDL change
-- (CREATE/ALTER/DROP TABLE, new columns, new RPCs, etc.)
--
-- This prevents the stale-schema-cache bug where PostgREST returns
-- "Could not find column X in the schema cache" after migrations.
--
-- See: https://docs.postgrest.org/en/latest/references/schema_cache.html

-- Create the notification function
CREATE OR REPLACE FUNCTION pgrst_ddl_watch()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

-- Fire on any DDL command that completes successfully
DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch_trigger;
CREATE EVENT TRIGGER pgrst_ddl_watch_trigger
  ON ddl_command_end
  EXECUTE FUNCTION pgrst_ddl_watch();
