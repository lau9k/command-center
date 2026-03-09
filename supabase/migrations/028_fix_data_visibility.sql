-- 028_fix_data_visibility.sql
-- BAS-71: Add permissive access policies for service-client API routes.
-- Tables like content_posts already have this (migration 022);
-- contacts, tasks, projects, pipeline_items, and invoices need it too.

-- CONTACTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contacts'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON contacts FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- TASKS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON tasks FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- PROJECTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON projects FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- PIPELINE_ITEMS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_items'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON pipeline_items FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- INVOICES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON invoices FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- PIPELINES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipelines'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON pipelines FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- PIPELINE_STAGES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pipeline_stages'
      AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access"
      ON pipeline_stages FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- Make tasks.user_id nullable so seed/quick-add tasks work without auth
ALTER TABLE tasks ALTER COLUMN user_id DROP NOT NULL;
