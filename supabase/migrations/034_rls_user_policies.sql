-- ============================================================
-- BAS-98: Add authenticated user RLS policies
-- Adds auth.uid()-based SELECT/INSERT/UPDATE/DELETE policies
-- so authenticated users can access their own data via the
-- anon/authenticated client (not just service_role).
-- ============================================================

-- ---- projects ----
CREATE POLICY "users_own_projects" ON projects
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- tasks ----
CREATE POLICY "users_own_tasks" ON tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- contacts ----
CREATE POLICY "users_own_contacts" ON contacts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- pipelines ----
CREATE POLICY "users_own_pipelines" ON pipelines
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- pipeline_stages ----
CREATE POLICY "users_own_pipeline_stages" ON pipeline_stages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- pipeline_items ----
CREATE POLICY "users_own_pipeline_items" ON pipeline_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- content_posts ----
-- Authenticated policy already exists from 005_content_posts_invoices.sql
-- ("Users can manage their own content posts")

-- ---- invoices ----
-- Authenticated policy already exists from 005_content_posts_invoices.sql
-- ("Users can manage their own invoices")
-- But invoices was missed in 029_enable_rls.sql — add FORCE + service_role now:
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON invoices
  TO service_role USING (true) WITH CHECK (true);

-- ---- transactions ----
CREATE POLICY "users_own_transactions" ON transactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- debts ----
CREATE POLICY "users_own_debts" ON debts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- crypto_balances ----
CREATE POLICY "users_own_crypto_balances" ON crypto_balances
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- balance_snapshots ----
CREATE POLICY "users_own_balance_snapshots" ON balance_snapshots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- notifications ----
CREATE POLICY "users_own_notifications" ON notifications
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- conversations ----
CREATE POLICY "users_own_conversations" ON conversations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- reimbursement_requests ----
CREATE POLICY "users_own_reimbursement_requests" ON reimbursement_requests
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- reimbursement_items ----
CREATE POLICY "users_own_reimbursement_items" ON reimbursement_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- reimbursement_payments ----
CREATE POLICY "users_own_reimbursement_payments" ON reimbursement_payments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- reimbursement_payment_allocations ----
CREATE POLICY "users_own_reimbursement_payment_allocations" ON reimbursement_payment_allocations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- scheduled_flows ----
CREATE POLICY "users_own_scheduled_flows" ON scheduled_flows
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- forecast_runs ----
CREATE POLICY "users_own_forecast_runs" ON forecast_runs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- cash_forecasts ----
CREATE POLICY "users_own_cash_forecasts" ON cash_forecasts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---- plaid_items (user_id is TEXT, cast auth.uid()) ----
CREATE POLICY "users_own_plaid_items" ON plaid_items
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- ---- bank_transactions (user_id is TEXT, cast auth.uid()) ----
CREATE POLICY "users_own_bank_transactions" ON bank_transactions
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- ---- plaid_accounts (user_id is TEXT, cast auth.uid()) ----
CREATE POLICY "users_own_plaid_accounts" ON plaid_accounts
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- ---- task_feedback (no user_id — access via parent task) ----
CREATE POLICY "users_own_task_feedback" ON task_feedback
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_feedback.task_id AND tasks.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks WHERE tasks.id = task_feedback.task_id AND tasks.user_id = auth.uid()
  ));

-- ---- memory_stats (no user_id — access via parent project) ----
CREATE POLICY "users_own_memory_stats" ON memory_stats
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = memory_stats.project_id AND projects.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = memory_stats.project_id AND projects.user_id = auth.uid()
  ));

-- ---- imports (service-role only — no user_id column) ----
-- No authenticated policy; imports are managed server-side only.

-- ---- community_stats (service-role only — global cache) ----
ALTER TABLE community_stats FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON community_stats
  TO service_role USING (true) WITH CHECK (true);
-- Allow authenticated users to read community stats (public data)
CREATE POLICY "authenticated_read_community_stats" ON community_stats
  FOR SELECT TO authenticated
  USING (true);

-- ---- github_stats (service-role only — global cache) ----
ALTER TABLE github_stats FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON github_stats
  TO service_role USING (true) WITH CHECK (true);
-- Allow authenticated users to read github stats (public data)
CREATE POLICY "authenticated_read_github_stats" ON github_stats
  FOR SELECT TO authenticated
  USING (true);

-- ---- notifications (missed in 029 — enable RLS now) ----
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON notifications
  TO service_role USING (true) WITH CHECK (true);

-- ---- task_feedback (missed in 029 — enable RLS now) ----
ALTER TABLE task_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_feedback FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON task_feedback
  TO service_role USING (true) WITH CHECK (true);
