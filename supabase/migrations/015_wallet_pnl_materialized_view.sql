-- 015_wallet_pnl_materialized_view.sql
-- Materialized view: wallet_pnl_monthly
-- Aggregates transactions by user (wallet proxy) and month for fast P&L queries.

CREATE MATERIALIZED VIEW IF NOT EXISTS wallet_pnl_monthly AS
SELECT
  user_id                                        AS wallet_id,
  date_trunc('month', COALESCE(start_date, created_at::date))::date AS month,
  COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)           AS income,
  COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)          AS expenses,
  COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)
    - COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)      AS net,
  COALESCE(SUM(amount) FILTER (WHERE type = 'expense' AND is_reimbursable = true), 0)
                                                                     AS reimbursable_expenses,
  COUNT(*)                                                           AS transaction_count
FROM transactions
GROUP BY user_id, date_trunc('month', COALESCE(start_date, created_at::date));

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_pnl_monthly_pk
  ON wallet_pnl_monthly (wallet_id, month);

-- Function to refresh the materialized view (call after transaction CRUD)
CREATE OR REPLACE FUNCTION refresh_wallet_pnl_monthly()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY wallet_pnl_monthly;
END;
$$;
