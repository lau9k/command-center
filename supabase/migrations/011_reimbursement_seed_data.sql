-- 011_reimbursement_seed_data.sql
-- Seed reimbursement data: 2 MEEK reimbursement requests (Jan + Feb 2026).
-- Part of BAS-24: Finance Module — Reimbursements.
-- user_id placeholder: update after first sign-in.

-- ============================================================
-- REIMBURSEMENT REQUEST #1: January 2026 MEEK expenses ($2,098)
-- ============================================================
INSERT INTO reimbursement_requests (id, user_id, title, description, wallet, status, submitted_at, total_amount, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111101',
  '00000000-0000-0000-0000-000000000000',
  'MEEK Jan 2026 Expenses',
  'Monthly operating expenses for MEEK project — January 2026',
  'MEEK',
  'submitted',
  '2026-02-01T00:00:00Z',
  2098.00,
  '2026-01-31T00:00:00Z'
);

-- Line items for Jan request
INSERT INTO reimbursement_items (user_id, reimbursement_request_id, description, amount, expense_date) VALUES
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'Vercel Pro (MEEK deployment)',         27.00, '2026-01-01'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'Supabase Pro (MEEK backend)',          34.00, '2026-01-01'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'OpenAI API credits',                  185.00, '2026-01-15'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'Telegram Bot API hosting (Railway)',   12.00, '2026-01-01'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'Domain renewal (meek.bot)',            18.00, '2026-01-10'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'Stripe fees',                         42.00, '2026-01-31'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'Marketing spend (Reddit ads)',        280.00, '2026-01-20'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111101', 'Contractor payment (design work)',   1500.00, '2026-01-25');

-- ============================================================
-- REIMBURSEMENT REQUEST #2: February 2026 MEEK expenses ($2,700)
-- ============================================================
INSERT INTO reimbursement_requests (id, user_id, title, description, wallet, status, submitted_at, total_amount, created_at)
VALUES (
  '11111111-1111-1111-1111-111111111102',
  '00000000-0000-0000-0000-000000000000',
  'MEEK Feb 2026 Expenses',
  'Monthly operating expenses for MEEK project — February 2026',
  'MEEK',
  'submitted',
  '2026-03-01T00:00:00Z',
  2700.00,
  '2026-02-28T00:00:00Z'
);

-- Line items for Feb request
INSERT INTO reimbursement_items (user_id, reimbursement_request_id, description, amount, expense_date) VALUES
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'Vercel Pro (MEEK deployment)',         27.00, '2026-02-01'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'Supabase Pro (MEEK backend)',          34.00, '2026-02-01'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'OpenAI API credits',                  240.00, '2026-02-15'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'Telegram Bot API hosting (Railway)',   12.00, '2026-02-01'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'Stripe fees',                         57.00, '2026-02-28'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'Marketing spend (Reddit + Twitter)',  330.00, '2026-02-18'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'Contractor payment (design work)',   1500.00, '2026-02-22'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'Customer support tooling (Crisp)',     25.00, '2026-02-01'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'Analytics (Mixpanel)',                 75.00, '2026-02-01'),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111102', 'AWS S3 storage',                     400.00, '2026-02-28');

-- ============================================================
-- Mark some existing transactions as reimbursable
-- ============================================================
UPDATE transactions
SET is_reimbursable = true
WHERE name IN ('Vercel Pro', 'Supabase Pro')
  AND user_id = '00000000-0000-0000-0000-000000000000';
