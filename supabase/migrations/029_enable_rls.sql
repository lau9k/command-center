-- ============================================================
-- BAS-74: Enable Row Level Security on ALL tables
-- Default deny-all + service-role-only full access
-- ============================================================

-- Helper: enable RLS, add deny-all default, allow service_role full access
-- We apply this pattern to every table in the public schema.

-- ---- contacts ----
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON contacts TO service_role USING (true) WITH CHECK (true);

-- ---- tasks ----
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON tasks TO service_role USING (true) WITH CHECK (true);

-- ---- content_posts ----
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON content_posts TO service_role USING (true) WITH CHECK (true);

-- ---- pipeline_items ----
ALTER TABLE pipeline_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_items FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON pipeline_items TO service_role USING (true) WITH CHECK (true);

-- ---- pipeline_stages ----
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON pipeline_stages TO service_role USING (true) WITH CHECK (true);

-- ---- pipelines ----
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipelines FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON pipelines TO service_role USING (true) WITH CHECK (true);

-- ---- projects ----
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON projects TO service_role USING (true) WITH CHECK (true);

-- ---- transactions ----
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON transactions TO service_role USING (true) WITH CHECK (true);

-- ---- bank_transactions ----
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON bank_transactions TO service_role USING (true) WITH CHECK (true);

-- ---- debts ----
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON debts TO service_role USING (true) WITH CHECK (true);

-- ---- crypto_balances ----
ALTER TABLE crypto_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_balances FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON crypto_balances TO service_role USING (true) WITH CHECK (true);

-- ---- balance_snapshots ----
ALTER TABLE balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON balance_snapshots TO service_role USING (true) WITH CHECK (true);

-- ---- scheduled_flows ----
ALTER TABLE scheduled_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_flows FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON scheduled_flows TO service_role USING (true) WITH CHECK (true);

-- ---- forecast_runs ----
ALTER TABLE forecast_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON forecast_runs TO service_role USING (true) WITH CHECK (true);

-- ---- cash_forecasts ----
ALTER TABLE cash_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_forecasts FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON cash_forecasts TO service_role USING (true) WITH CHECK (true);

-- ---- reimbursement_requests ----
ALTER TABLE reimbursement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON reimbursement_requests TO service_role USING (true) WITH CHECK (true);

-- ---- reimbursement_items ----
ALTER TABLE reimbursement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_items FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON reimbursement_items TO service_role USING (true) WITH CHECK (true);

-- ---- reimbursement_payments ----
ALTER TABLE reimbursement_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_payments FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON reimbursement_payments TO service_role USING (true) WITH CHECK (true);

-- ---- reimbursement_payment_allocations ----
ALTER TABLE reimbursement_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_payment_allocations FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON reimbursement_payment_allocations TO service_role USING (true) WITH CHECK (true);

-- ---- memory_stats ----
ALTER TABLE memory_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_stats FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON memory_stats TO service_role USING (true) WITH CHECK (true);

-- ---- imports ----
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON imports TO service_role USING (true) WITH CHECK (true);

-- ---- plaid_items ----
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_items FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON plaid_items TO service_role USING (true) WITH CHECK (true);

-- ---- plaid_accounts ----
ALTER TABLE plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_accounts FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON plaid_accounts TO service_role USING (true) WITH CHECK (true);

-- ---- conversations ----
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON conversations TO service_role USING (true) WITH CHECK (true);

-- NOTE: wallet_pnl_monthly is a materialized view and cannot have RLS.
-- Access is controlled via the service_role client only.
