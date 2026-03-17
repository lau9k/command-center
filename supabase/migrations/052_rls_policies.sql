-- ============================================================
-- 052: Enable RLS on all core tables + permissive policies
-- Ensures service_role and anon can access all tables.
-- Tables that already have RLS enabled will just get the
-- missing anon/service_role policies added.
-- ============================================================

-- ---- contacts ----
-- RLS already enabled (029). Add anon policy.
DROP POLICY IF EXISTS "Allow all for anon" ON contacts;
CREATE POLICY "Allow all for anon" ON contacts FOR ALL TO anon USING (true) WITH CHECK (true);

-- ---- tasks ----
DROP POLICY IF EXISTS "Allow all for anon" ON tasks;
CREATE POLICY "Allow all for anon" ON tasks FOR ALL TO anon USING (true) WITH CHECK (true);

-- ---- content_posts ----
DROP POLICY IF EXISTS "Allow all for anon" ON content_posts;
CREATE POLICY "Allow all for anon" ON content_posts FOR ALL TO anon USING (true) WITH CHECK (true);

-- ---- transactions ----
DROP POLICY IF EXISTS "Allow all for anon" ON transactions;
CREATE POLICY "Allow all for anon" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);

-- ---- projects ----
DROP POLICY IF EXISTS "Allow all for anon" ON projects;
CREATE POLICY "Allow all for anon" ON projects FOR ALL TO anon USING (true) WITH CHECK (true);

-- ---- notifications ----
DROP POLICY IF EXISTS "Allow all for service_role" ON notifications;
CREATE POLICY "Allow all for service_role" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for anon" ON notifications;
CREATE POLICY "Allow all for anon" ON notifications FOR ALL TO anon USING (true) WITH CHECK (true);

-- ---- meetings (missing RLS entirely) ----
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON meetings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON meetings FOR ALL TO anon USING (true) WITH CHECK (true);

-- ---- meeting_actions (missing RLS entirely) ----
ALTER TABLE meeting_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_actions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON meeting_actions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON meeting_actions FOR ALL TO anon USING (true) WITH CHECK (true);

-- ---- pipeline_items (used as "deals") ----
DROP POLICY IF EXISTS "Allow all for anon" ON pipeline_items;
CREATE POLICY "Allow all for anon" ON pipeline_items FOR ALL TO anon USING (true) WITH CHECK (true);

-- NOTE: "deals", "wallets", and "resources" tables do not exist in the schema.
-- pipeline_items serves as the deals table. Wallets and resources should be
-- created in a separate migration if/when needed.
