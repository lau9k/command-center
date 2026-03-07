-- 007_seed_finance_data.sql
-- Seed finance tables with real data from RBC bank export (March 6, 2026).
-- Part of BAS-20: Finance Data Seeding.
-- user_id placeholder: update after first sign-in.

-- ============================================================
-- RECURRING EXPENSE TRANSACTIONS (~45 rows)
-- ============================================================
INSERT INTO transactions (user_id, name, amount, type, category, interval, due_day, start_date, notes) VALUES
  -- Housing & Utilities
  ('00000000-0000-0000-0000-000000000000', 'Rent',                           1400.00, 'expense', 'housing',        'monthly',  1,  '2025-01-01', 'Room rental'),
  ('00000000-0000-0000-0000-000000000000', 'Hydro (Toronto Hydro)',            65.00, 'expense', 'utilities',      'monthly',  15, '2025-01-01', NULL),
  ('00000000-0000-0000-0000-000000000000', 'Internet (Bell)',                  85.00, 'expense', 'utilities',      'monthly',  20, '2025-01-01', NULL),
  ('00000000-0000-0000-0000-000000000000', 'Phone (Freedom Mobile)',           50.00, 'expense', 'utilities',      'monthly',  22, '2025-01-01', NULL),

  -- Subscriptions & Software
  ('00000000-0000-0000-0000-000000000000', 'Spotify Premium',                 11.99, 'expense', 'subscriptions',  'monthly',  5,  '2025-01-01', NULL),
  ('00000000-0000-0000-0000-000000000000', 'Apple iCloud+ (200GB)',            3.99, 'expense', 'subscriptions',  'monthly',  5,  '2025-01-01', NULL),
  ('00000000-0000-0000-0000-000000000000', 'YouTube Premium',                 13.99, 'expense', 'subscriptions',  'monthly',  8,  '2025-01-01', NULL),
  ('00000000-0000-0000-0000-000000000000', 'ChatGPT Plus',                    27.00, 'expense', 'subscriptions',  'monthly',  12, '2025-06-01', 'USD converted'),
  ('00000000-0000-0000-0000-000000000000', 'Claude Pro',                      27.00, 'expense', 'subscriptions',  'monthly',  12, '2025-09-01', 'USD converted'),
  ('00000000-0000-0000-0000-000000000000', 'Notion Plus',                     14.00, 'expense', 'subscriptions',  'monthly',  15, '2025-01-01', NULL),
  ('00000000-0000-0000-0000-000000000000', 'GitHub Copilot',                  13.00, 'expense', 'subscriptions',  'monthly',  18, '2025-01-01', 'USD converted'),
  ('00000000-0000-0000-0000-000000000000', 'Vercel Pro',                      27.00, 'expense', 'subscriptions',  'monthly',  1,  '2025-03-01', 'USD converted'),
  ('00000000-0000-0000-0000-000000000000', 'Supabase Pro',                    34.00, 'expense', 'subscriptions',  'monthly',  1,  '2025-06-01', 'USD converted'),
  ('00000000-0000-0000-0000-000000000000', 'Domain (Namecheap)',              18.00, 'expense', 'subscriptions',  'monthly',  10, '2025-01-01', 'Avg monthly from annual'),
  ('00000000-0000-0000-0000-000000000000', 'Linear (Startup plan)',            0.00, 'expense', 'subscriptions',  'monthly',  1,  '2026-01-01', 'Free tier'),
  ('00000000-0000-0000-0000-000000000000', 'Figma',                            0.00, 'expense', 'subscriptions',  'monthly',  1,  '2025-01-01', 'Free tier'),
  ('00000000-0000-0000-0000-000000000000', 'Netflix',                         20.99, 'expense', 'subscriptions',  'monthly',  3,  '2025-01-01', 'Standard plan'),

  -- Transportation
  ('00000000-0000-0000-0000-000000000000', 'TTC Metropass',                  156.00, 'expense', 'transportation', 'monthly',  1,  '2025-01-01', NULL),
  ('00000000-0000-0000-0000-000000000000', 'Uber / Lyft',                     60.00, 'expense', 'transportation', 'monthly',  NULL, '2025-01-01', 'Estimated monthly avg'),

  -- Food & Groceries
  ('00000000-0000-0000-0000-000000000000', 'Groceries (No Frills / FreshCo)',350.00, 'expense', 'food',           'monthly',  NULL, '2025-01-01', 'Estimated monthly avg'),
  ('00000000-0000-0000-0000-000000000000', 'Restaurants / Takeout',          180.00, 'expense', 'food',           'monthly',  NULL, '2025-01-01', 'Estimated monthly avg'),
  ('00000000-0000-0000-0000-000000000000', 'Coffee (Tim Hortons / Starbucks)', 45.00, 'expense', 'food',          'monthly',  NULL, '2025-01-01', 'Estimated monthly avg'),

  -- Health & Fitness
  ('00000000-0000-0000-0000-000000000000', 'Gym (GoodLife Fitness)',           55.00, 'expense', 'health',         'monthly',  1,  '2025-01-01', NULL),
  ('00000000-0000-0000-0000-000000000000', 'Supplements / Vitamins',          40.00, 'expense', 'health',         'monthly',  NULL, '2025-01-01', 'Estimated monthly avg'),
  ('00000000-0000-0000-0000-000000000000', 'Haircut',                         35.00, 'expense', 'personal',       'monthly',  NULL, '2025-01-01', NULL),

  -- Debt Payments
  ('00000000-0000-0000-0000-000000000000', 'Personal Loan Payment (RBC)',    350.00, 'expense', 'debt_payment',   'monthly',  15, '2025-01-01', 'Min payment on personal loan'),
  ('00000000-0000-0000-0000-000000000000', 'Credit Line Payment (RBC)',      200.00, 'expense', 'debt_payment',   'monthly',  20, '2025-01-01', 'Min payment on credit line'),
  ('00000000-0000-0000-0000-000000000000', 'Visa Min Payment (RBC)',         150.00, 'expense', 'debt_payment',   'monthly',  25, '2025-01-01', 'Min payment on Visa'),
  ('00000000-0000-0000-0000-000000000000', 'Mom Loan Payment',               500.00, 'expense', 'debt_payment',   'monthly',  1,  '2025-06-01', 'Monthly repayment to mom'),

  -- Insurance
  ('00000000-0000-0000-0000-000000000000', 'Tenant Insurance (Square One)',   30.00, 'expense', 'insurance',      'monthly',  1,  '2025-01-01', NULL),

  -- Education / Professional Development
  ('00000000-0000-0000-0000-000000000000', 'Udemy / Coursera',                20.00, 'expense', 'education',      'monthly',  NULL, '2025-01-01', 'Estimated avg'),
  ('00000000-0000-0000-0000-000000000000', 'Books / Kindle',                  15.00, 'expense', 'education',      'monthly',  NULL, '2025-01-01', 'Estimated avg'),

  -- Entertainment
  ('00000000-0000-0000-0000-000000000000', 'Gaming (Steam / PS Store)',       25.00, 'expense', 'entertainment',  'monthly',  NULL, '2025-01-01', 'Estimated avg'),
  ('00000000-0000-0000-0000-000000000000', 'Going out / Events',              80.00, 'expense', 'entertainment',  'monthly',  NULL, '2025-01-01', 'Estimated avg'),

  -- Miscellaneous
  ('00000000-0000-0000-0000-000000000000', 'Amazon / Online Shopping',        75.00, 'expense', 'shopping',       'monthly',  NULL, '2025-01-01', 'Estimated avg'),
  ('00000000-0000-0000-0000-000000000000', 'Clothing',                        60.00, 'expense', 'shopping',       'monthly',  NULL, '2025-01-01', 'Estimated avg'),
  ('00000000-0000-0000-0000-000000000000', 'Laundry',                         30.00, 'expense', 'personal',       'monthly',  NULL, '2025-01-01', NULL),
  ('00000000-0000-0000-0000-000000000000', 'Bank Fees (RBC)',                  4.00, 'expense', 'fees',           'monthly',  1,  '2025-01-01', 'Monthly account fee'),
  ('00000000-0000-0000-0000-000000000000', 'Gifts / Donations',              40.00, 'expense', 'personal',       'monthly',  NULL, '2025-01-01', 'Estimated avg'),

  -- One-time March 2026 expenses
  ('00000000-0000-0000-0000-000000000000', 'Winter jacket (Uniqlo)',          89.99, 'expense', 'shopping',       'one_time', NULL, '2026-03-02', NULL),
  ('00000000-0000-0000-0000-000000000000', 'Dentist co-pay',                  45.00, 'expense', 'health',         'one_time', NULL, '2026-03-04', NULL),
  ('00000000-0000-0000-0000-000000000000', 'Uber Eats (birthday dinner)',     62.50, 'expense', 'food',           'one_time', NULL, '2026-03-01', NULL),
  ('00000000-0000-0000-0000-000000000000', 'LCBO',                            38.75, 'expense', 'entertainment',  'one_time', NULL, '2026-03-05', NULL),
  ('00000000-0000-0000-0000-000000000000', 'Pharmacy (Shoppers)',              22.40, 'expense', 'health',         'one_time', NULL, '2026-03-03', NULL),
  ('00000000-0000-0000-0000-000000000000', 'Presto reload',                   50.00, 'expense', 'transportation', 'one_time', NULL, '2026-03-06', NULL);

-- ============================================================
-- FUTURE HOUSING EXPENSES (April 2026)
-- ============================================================
INSERT INTO transactions (user_id, name, amount, type, category, interval, due_day, start_date, notes) VALUES
  ('00000000-0000-0000-0000-000000000000', 'New Apartment Rent',            1800.00, 'expense', 'housing',   'monthly',  1,  '2026-04-01', 'Moving to new place April'),
  ('00000000-0000-0000-0000-000000000000', 'First & Last Deposit',          3600.00, 'expense', 'housing',   'one_time', NULL, '2026-04-01', 'First and last month deposit'),
  ('00000000-0000-0000-0000-000000000000', 'Moving Costs',                   400.00, 'expense', 'housing',   'one_time', NULL, '2026-04-01', 'U-Haul + supplies'),
  ('00000000-0000-0000-0000-000000000000', 'Furniture (IKEA)',               600.00, 'expense', 'housing',   'one_time', NULL, '2026-04-01', 'Desk, shelf, basics');

-- ============================================================
-- INCOME TRANSACTIONS (6 rows)
-- ============================================================
INSERT INTO transactions (user_id, name, amount, type, category, interval, due_day, start_date, notes) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Personize - Contract Income',  4500.00, 'income', 'freelance',    'biweekly', 15, '2025-09-01', 'Main contract'),
  ('00000000-0000-0000-0000-000000000000', 'MEEK - Revenue Share',          800.00, 'income', 'business',     'monthly',  1,  '2025-06-01', 'Telegram bot revenue'),
  ('00000000-0000-0000-0000-000000000000', 'Hackathon Prize (ETHGlobal)',  1500.00, 'income', 'prize',        'one_time', NULL, '2026-02-15', 'Feb 2026 hackathon win'),
  ('00000000-0000-0000-0000-000000000000', 'Freelance Web Dev',            1200.00, 'income', 'freelance',    'one_time', NULL, '2026-01-20', 'One-off project'),
  ('00000000-0000-0000-0000-000000000000', 'Eventium - Consulting',         600.00, 'income', 'consulting',   'monthly',  15, '2026-01-01', 'Monthly retainer'),
  ('00000000-0000-0000-0000-000000000000', 'Tax Refund (CRA)',             2100.00, 'income', 'tax_refund',   'one_time', NULL, '2026-03-05', '2025 tax year refund');

-- ============================================================
-- DEBTS (4 rows)
-- ============================================================
INSERT INTO debts (user_id, name, type, principal, balance, interest_rate, min_payment, due_day, lender, notes) VALUES
  ('00000000-0000-0000-0000-000000000000', 'RBC Personal Loan',     'loan',          22000.00, 18231.00,  9.50, 350.00, 15, 'RBC Royal Bank', 'Consolidated personal loan'),
  ('00000000-0000-0000-0000-000000000000', 'RBC Credit Line',       'credit_line',   20000.00, 14900.00,  7.20, 200.00, 20, 'RBC Royal Bank', 'Personal line of credit'),
  ('00000000-0000-0000-0000-000000000000', 'RBC Visa',              'loan',           8000.00,  5850.00, 19.99, 150.00, 25, 'RBC Royal Bank', 'Visa credit card balance'),
  ('00000000-0000-0000-0000-000000000000', 'Mom Loan',              'personal',      40000.00, 35141.00,  0.00, 500.00,  1, NULL,             'Interest-free family loan');

-- ============================================================
-- BALANCE SNAPSHOT (March 6, 2026)
-- ============================================================
INSERT INTO balance_snapshots (user_id, snapshot_date, chequing, savings, credit_available, total_debt, net_worth, notes) VALUES
  ('00000000-0000-0000-0000-000000000000', '2026-03-06', 2847.32, 510.00, 5100.00, 74122.00, -70764.68, 'RBC export snapshot');
