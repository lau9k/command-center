-- 013_forecast_seed_data.sql
-- Seed data for forecast engine: 12 scheduled flows + 5 preset scenarios.
-- Part of BAS-25: Finance Module — Forecast Engine.

-- ============================================================
-- SCHEDULED FLOWS (12 rows)
-- Models real cash flows as forecast inputs.
-- ============================================================
INSERT INTO scheduled_flows (user_id, name, amount, direction, cadence, due_day, start_date, category, probability, earliest_date, latest_date, notes, is_active) VALUES
  -- Income flows
  ('00000000-0000-0000-0000-000000000000', 'MEEK Retainer',          800.00,  'inflow',  'monthly',   1,  '2025-06-01', 'business',     0.85, NULL,         NULL,         'Telegram bot revenue share',       true),
  ('00000000-0000-0000-0000-000000000000', 'Personize Contract',    4500.00,  'inflow',  'biweekly', 15,  '2025-09-01', 'freelance',    0.95, NULL,         NULL,         'Main contract income',             true),
  ('00000000-0000-0000-0000-000000000000', 'Eventium Consulting',    600.00,  'inflow',  'monthly',  15,  '2026-01-01', 'consulting',   0.90, NULL,         NULL,         'Monthly retainer',                 true),

  -- Housing & Utilities
  ('00000000-0000-0000-0000-000000000000', 'Rent',                  1400.00,  'outflow', 'monthly',   1,  '2025-01-01', 'housing',      1.00, NULL,         NULL,         'Current room rental',              true),
  ('00000000-0000-0000-0000-000000000000', 'New Apartment Rent',    1800.00,  'outflow', 'monthly',   1,  '2026-04-01', 'housing',      1.00, NULL,         NULL,         'Moving to new place April',        false),

  -- Debt payments
  ('00000000-0000-0000-0000-000000000000', 'Personal Loan (RBC)',    350.00,  'outflow', 'monthly',  15,  '2025-01-01', 'debt_payment', 1.00, NULL,         NULL,         'Min payment on personal loan',     true),
  ('00000000-0000-0000-0000-000000000000', 'Credit Line (RBC)',      200.00,  'outflow', 'monthly',  20,  '2025-01-01', 'debt_payment', 1.00, NULL,         NULL,         'Min payment on credit line',       true),
  ('00000000-0000-0000-0000-000000000000', 'Mom Loan Payment',       500.00,  'outflow', 'monthly',   1,  '2025-06-01', 'debt_payment', 1.00, NULL,         NULL,         'Monthly repayment to mom',         true),

  -- Living expenses
  ('00000000-0000-0000-0000-000000000000', 'Groceries',              350.00,  'outflow', 'monthly',  NULL, '2025-01-01', 'food',        1.00, NULL,         NULL,         'Monthly grocery estimate',         true),
  ('00000000-0000-0000-0000-000000000000', 'Software & Subs',        200.00,  'outflow', 'monthly',   1,  '2025-01-01', 'subscriptions',1.00, NULL,         NULL,         'Combined software subscriptions',  true),
  ('00000000-0000-0000-0000-000000000000', 'Transportation',         216.00,  'outflow', 'monthly',   1,  '2025-01-01', 'transportation',1.00, NULL,        NULL,         'TTC + rideshare estimate',         true),
  ('00000000-0000-0000-0000-000000000000', 'Misc Living',            400.00,  'outflow', 'monthly',  NULL, '2025-01-01', 'personal',    1.00, NULL,         NULL,         'Food out, entertainment, personal',true);

-- ============================================================
-- FORECAST RUNS (5 preset scenarios)
-- transforms: JSON array of transform rules applied during compute.
-- ============================================================
INSERT INTO forecast_runs (user_id, name, description, horizon_days, starting_cash, transforms, is_preset) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'Base',
    'Current trajectory with all active flows at stated probabilities.',
    90,
    2847.32,
    '[]'::JSONB,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Post-April',
    'After apartment move: new rent kicks in, current rent stops, one-time moving costs applied.',
    90,
    2847.32,
    '[{"type":"toggle_flow","flow_name":"Rent","active":false},{"type":"toggle_flow","flow_name":"New Apartment Rent","active":true},{"type":"add_one_time","name":"First & Last Deposit","amount":3600,"direction":"outflow","date":"2026-04-01"},{"type":"add_one_time","name":"Moving Costs","amount":400,"direction":"outflow","date":"2026-04-01"},{"type":"add_one_time","name":"Furniture (IKEA)","amount":600,"direction":"outflow","date":"2026-04-01"}]'::JSONB,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'MEEK -2wk',
    'MEEK payment delayed by 2 weeks each month.',
    90,
    2847.32,
    '[{"type":"delay_flow","flow_name":"MEEK Retainer","delay_days":14}]'::JSONB,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'MEEK Stops',
    'MEEK revenue stops entirely — worst-case scenario.',
    90,
    2847.32,
    '[{"type":"toggle_flow","flow_name":"MEEK Retainer","active":false}]'::JSONB,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Optimized',
    'Cut discretionary by 20%, delay non-essential payments.',
    90,
    2847.32,
    '[{"type":"scale_flow","flow_name":"Groceries","factor":0.85},{"type":"scale_flow","flow_name":"Misc Living","factor":0.70},{"type":"scale_flow","flow_name":"Software & Subs","factor":0.80}]'::JSONB,
    true
  );
