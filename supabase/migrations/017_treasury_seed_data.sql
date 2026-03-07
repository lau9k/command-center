-- 017_treasury_seed_data.sql
-- Seed crypto_balances with MEEK treasury holdings for BAS-28.

INSERT INTO crypto_balances (user_id, symbol, name, quantity, cost_basis, wallet, chain, liquid_amount, locked_amount, notes) VALUES
  ('00000000-0000-0000-0000-000000000000', 'MEEK',  'Meek Token',      2500000, 12500.00, 'MEEK', 'solana',   1750000, 750000,  'Project token — 30% locked until Q4 2026'),
  ('00000000-0000-0000-0000-000000000000', 'SOL',   'Solana',                85,  8500.00, 'MEEK', 'solana',        85,      0,  'Gas & operations'),
  ('00000000-0000-0000-0000-000000000000', 'USDC',  'USD Coin',            4200,  4200.00, 'MEEK', 'solana',      4200,      0,  'Stablecoin reserves'),
  ('00000000-0000-0000-0000-000000000000', 'USDT',  'Tether',             1800,  1800.00, 'MEEK', 'solana',      1800,      0,  'Stablecoin reserves'),
  ('00000000-0000-0000-0000-000000000000', 'BTC',   'Bitcoin',            0.045,  3800.00, 'Personal', 'bitcoin',  0.045,      0,  'Cold storage'),
  ('00000000-0000-0000-0000-000000000000', 'ETH',   'Ethereum',            1.2,   3600.00, 'Personal', 'ethereum',   0.8,    0.4, 'Partial stake on Lido');
