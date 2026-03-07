-- 010_reimbursements_tables.sql
-- Reimbursement tracking: requests, line items, payments, allocations.
-- Part of BAS-24: Finance Module — Reimbursements.

-- ============================================================
-- Add reimbursable flag to transactions
-- ============================================================
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS is_reimbursable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reimbursement_request_id UUID;

-- ============================================================
-- REIMBURSEMENT REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reimbursement_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  wallet          TEXT NOT NULL DEFAULT 'MEEK',
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'submitted', 'approved', 'paid')),
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  total_amount    NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reimbursement_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reimbursement requests"
  ON reimbursement_requests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON reimbursement_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- REIMBURSEMENT ITEMS (line items linked to transactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS reimbursement_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL,
  reimbursement_request_id UUID NOT NULL REFERENCES reimbursement_requests(id) ON DELETE CASCADE,
  transaction_id          UUID REFERENCES transactions(id) ON DELETE SET NULL,
  description             TEXT NOT NULL,
  amount                  NUMERIC NOT NULL,
  expense_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url             TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reimbursement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reimbursement items"
  ON reimbursement_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON reimbursement_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- REIMBURSEMENT PAYMENTS (incoming money from the project/entity)
-- ============================================================
CREATE TABLE IF NOT EXISTS reimbursement_payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  amount          NUMERIC NOT NULL,
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  TEXT,
  reference       TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reimbursement_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reimbursement payments"
  ON reimbursement_payments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON reimbursement_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- REIMBURSEMENT PAYMENT ALLOCATIONS (many-to-many: payment → request)
-- ============================================================
CREATE TABLE IF NOT EXISTS reimbursement_payment_allocations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL,
  payment_id              UUID NOT NULL REFERENCES reimbursement_payments(id) ON DELETE CASCADE,
  reimbursement_request_id UUID NOT NULL REFERENCES reimbursement_requests(id) ON DELETE CASCADE,
  amount                  NUMERIC NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reimbursement_payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own payment allocations"
  ON reimbursement_payment_allocations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- FK: transactions.reimbursement_request_id → reimbursement_requests
-- ============================================================
ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_reimbursement_request
  FOREIGN KEY (reimbursement_request_id) REFERENCES reimbursement_requests(id) ON DELETE SET NULL;

-- ============================================================
-- REIMBURSEMENT SUMMARY VIEW
-- ============================================================
CREATE OR REPLACE VIEW reimbursement_summary AS
SELECT
  rr.id,
  rr.user_id,
  rr.title,
  rr.wallet,
  rr.status,
  rr.total_amount,
  rr.submitted_at,
  rr.approved_at,
  rr.paid_at,
  rr.created_at,
  COALESCE(SUM(rpa.amount), 0) AS amount_paid,
  rr.total_amount - COALESCE(SUM(rpa.amount), 0) AS amount_outstanding,
  COUNT(DISTINCT ri.id) AS item_count,
  -- Float cost: amount_outstanding * 0.2599 / 365 * days_open
  CASE
    WHEN rr.status != 'paid' THEN
      (rr.total_amount - COALESCE(SUM(rpa.amount), 0))
      * 0.2599 / 365
      * EXTRACT(DAY FROM (now() - rr.created_at))
    ELSE 0
  END AS float_cost
FROM reimbursement_requests rr
LEFT JOIN reimbursement_payment_allocations rpa ON rpa.reimbursement_request_id = rr.id
LEFT JOIN reimbursement_items ri ON ri.reimbursement_request_id = rr.id
GROUP BY rr.id, rr.user_id, rr.title, rr.wallet, rr.status,
         rr.total_amount, rr.submitted_at, rr.approved_at, rr.paid_at, rr.created_at;
