-- ============================================================
-- BAS-298: Enable RLS on resources table & add user-scoped access
--
-- The resources table (created in 052_resources.sql) was missing
-- RLS entirely — noted in 052_rls_policies.sql as not yet existing
-- at that time. This migration closes that security gap.
-- ============================================================

-- 1. Add user_id column (required for auth.uid()-based policies)
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Enable Row Level Security
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources FORCE ROW LEVEL SECURITY;

-- 3. Service-role bypass (matches pattern from 029_enable_rls.sql)
CREATE POLICY "service_role_all" ON resources
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. Authenticated user-scoped CRUD (matches pattern from 034_rls_user_policies.sql)
CREATE POLICY "users_own_resources" ON resources
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Anon access — permissive policy for anon role
--    This follows the same pattern established in 052_rls_policies.sql
--    which grants anon full access to all core tables (contacts, tasks,
--    content_posts, transactions, projects, notifications, meetings,
--    meeting_actions, pipeline_items). The anon role is used by the
--    Next.js server-side API routes via the Supabase anon key; actual
--    user-facing auth is enforced at the application layer.
CREATE POLICY "Allow all for anon" ON resources
  FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 6. Index on user_id for policy performance
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON resources(user_id);
