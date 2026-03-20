import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

// ---------------------------------------------------------------------------
// Stable UUIDs for fixture data (deterministic so upsert works on re-run)
// ---------------------------------------------------------------------------

function financeId(prefix: string, index: number): string {
  const hex = index.toString(16).padStart(12, "0");
  return `${prefix}-0000-0000-0000-${hex}`;
}

const TX_PREFIX = "f1000000";
const DEBT_PREFIX = "f2000000";
const CRYPTO_PREFIX = "f3000000";
const SNAPSHOT_PREFIX = "f4000000";
const FLOW_PREFIX = "f5000000";

// ---------------------------------------------------------------------------
// Auth helper (mirrors app/api/admin/seed/route.ts)
// ---------------------------------------------------------------------------

function authenticate(req: NextRequest): NextResponse | null {
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SEED_SECRET env var is not configured" },
      { status: 500 },
    );
  }

  const provided =
    req.headers.get("x-seed-secret") ??
    req.nextUrl.searchParams.get("secret");

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolve seed user_id from existing data
// ---------------------------------------------------------------------------

async function getSeedUserId(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<string> {
  const { data } = await supabase
    .from("projects")
    .select("user_id")
    .limit(1)
    .single();

  return data?.user_id ?? "00000000-0000-0000-0000-000000000000";
}

// ---------------------------------------------------------------------------
// Seed data definitions
// ---------------------------------------------------------------------------

function buildTransactions(userId: string) {
  const txs: Array<{
    id: string;
    user_id: string;
    name: string;
    amount: number;
    type: "expense" | "income";
    category: string | null;
    interval: "monthly" | "biweekly" | "weekly" | "one_time";
    due_day: number | null;
    start_date: string | null;
    notes: string | null;
  }> = [
    // --- Rent ---
    { id: financeId(TX_PREFIX, 1), user_id: userId, name: "Rent — January", amount: 1850, type: "expense", category: "rent", interval: "monthly", due_day: 1, start_date: "2026-01-01", notes: null },
    { id: financeId(TX_PREFIX, 2), user_id: userId, name: "Rent — February", amount: 1850, type: "expense", category: "rent", interval: "monthly", due_day: 1, start_date: "2026-02-01", notes: null },
    { id: financeId(TX_PREFIX, 3), user_id: userId, name: "Rent — March", amount: 1850, type: "expense", category: "rent", interval: "monthly", due_day: 1, start_date: "2026-03-01", notes: null },
    // --- Subscriptions ---
    { id: financeId(TX_PREFIX, 4), user_id: userId, name: "Vercel Pro", amount: 20, type: "expense", category: "subscriptions", interval: "monthly", due_day: 5, start_date: "2026-01-05", notes: null },
    { id: financeId(TX_PREFIX, 5), user_id: userId, name: "Supabase Pro", amount: 25, type: "expense", category: "subscriptions", interval: "monthly", due_day: 7, start_date: "2026-01-07", notes: null },
    { id: financeId(TX_PREFIX, 6), user_id: userId, name: "n8n Cloud", amount: 24, type: "expense", category: "subscriptions", interval: "monthly", due_day: 10, start_date: "2026-01-10", notes: null },
    { id: financeId(TX_PREFIX, 7), user_id: userId, name: "OpenAI API", amount: 120, type: "expense", category: "subscriptions", interval: "monthly", due_day: 12, start_date: "2026-01-12", notes: "GPT-4 usage" },
    { id: financeId(TX_PREFIX, 8), user_id: userId, name: "Anthropic API", amount: 200, type: "expense", category: "subscriptions", interval: "monthly", due_day: 14, start_date: "2026-01-14", notes: "Claude usage" },
    { id: financeId(TX_PREFIX, 9), user_id: userId, name: "Cursor Pro", amount: 20, type: "expense", category: "subscriptions", interval: "monthly", due_day: 15, start_date: "2026-01-15", notes: null },
    { id: financeId(TX_PREFIX, 10), user_id: userId, name: "GitHub Copilot", amount: 19, type: "expense", category: "subscriptions", interval: "monthly", due_day: 18, start_date: "2026-01-18", notes: null },
    { id: financeId(TX_PREFIX, 11), user_id: userId, name: "Domain renewals (3x)", amount: 42, type: "expense", category: "subscriptions", interval: "one_time", due_day: null, start_date: "2026-02-10", notes: "personize.ai, meek.gg, command-center.app" },
    { id: financeId(TX_PREFIX, 12), user_id: userId, name: "Linear", amount: 10, type: "expense", category: "subscriptions", interval: "monthly", due_day: 20, start_date: "2026-01-20", notes: null },
    { id: financeId(TX_PREFIX, 13), user_id: userId, name: "Figma Pro", amount: 15, type: "expense", category: "subscriptions", interval: "monthly", due_day: 22, start_date: "2026-01-22", notes: null },
    { id: financeId(TX_PREFIX, 14), user_id: userId, name: "Spotify + iCloud bundle", amount: 22, type: "expense", category: "subscriptions", interval: "monthly", due_day: 25, start_date: "2026-01-25", notes: null },
    // --- Food ---
    { id: financeId(TX_PREFIX, 15), user_id: userId, name: "Groceries — Jan", amount: 220, type: "expense", category: "food", interval: "monthly", due_day: null, start_date: "2026-01-08", notes: null },
    { id: financeId(TX_PREFIX, 16), user_id: userId, name: "Eating out — Jan", amount: 180, type: "expense", category: "food", interval: "monthly", due_day: null, start_date: "2026-01-15", notes: null },
    { id: financeId(TX_PREFIX, 17), user_id: userId, name: "Groceries — Feb", amount: 200, type: "expense", category: "food", interval: "monthly", due_day: null, start_date: "2026-02-05", notes: null },
    { id: financeId(TX_PREFIX, 18), user_id: userId, name: "Eating out — Feb", amount: 160, type: "expense", category: "food", interval: "monthly", due_day: null, start_date: "2026-02-12", notes: null },
    // --- Transport ---
    { id: financeId(TX_PREFIX, 19), user_id: userId, name: "Bus pass — Jan", amount: 85, type: "expense", category: "transport", interval: "monthly", due_day: 1, start_date: "2026-01-01", notes: null },
    { id: financeId(TX_PREFIX, 20), user_id: userId, name: "Bus pass — Feb", amount: 85, type: "expense", category: "transport", interval: "monthly", due_day: 1, start_date: "2026-02-01", notes: null },
    { id: financeId(TX_PREFIX, 21), user_id: userId, name: "Uber — Jan misc", amount: 30, type: "expense", category: "transport", interval: "one_time", due_day: null, start_date: "2026-01-20", notes: null },
    // --- MEEK reimbursements ---
    { id: financeId(TX_PREFIX, 22), user_id: userId, name: "MEEK reimbursement — hosting", amount: 450, type: "expense", category: "meek", interval: "one_time", due_day: null, start_date: "2026-01-15", notes: "VPS + CDN costs", is_reimbursable: true } as typeof txs[number],
    { id: financeId(TX_PREFIX, 23), user_id: userId, name: "MEEK reimbursement — design", amount: 300, type: "expense", category: "meek", interval: "one_time", due_day: null, start_date: "2026-02-03", notes: "Logo & brand assets", is_reimbursable: true } as typeof txs[number],
    { id: financeId(TX_PREFIX, 24), user_id: userId, name: "MEEK reimbursement — marketing", amount: 520, type: "expense", category: "meek", interval: "one_time", due_day: null, start_date: "2026-02-20", notes: "Social ads campaign", is_reimbursable: true } as typeof txs[number],
    // --- Personize revenue ---
    { id: financeId(TX_PREFIX, 25), user_id: userId, name: "Personize — Jan retainer", amount: 3500, type: "income", category: "personize", interval: "monthly", due_day: 15, start_date: "2026-01-15", notes: null },
    { id: financeId(TX_PREFIX, 26), user_id: userId, name: "Personize — Feb retainer", amount: 3500, type: "income", category: "personize", interval: "monthly", due_day: 15, start_date: "2026-02-15", notes: null },
    { id: financeId(TX_PREFIX, 27), user_id: userId, name: "Personize — Mar retainer", amount: 3500, type: "income", category: "personize", interval: "monthly", due_day: 15, start_date: "2026-03-15", notes: null },
    // --- Freelance income ---
    { id: financeId(TX_PREFIX, 28), user_id: userId, name: "Freelance — website build", amount: 1200, type: "income", category: "freelance", interval: "one_time", due_day: null, start_date: "2026-01-28", notes: "Landing page for local biz" },
    { id: financeId(TX_PREFIX, 29), user_id: userId, name: "Freelance — API integration", amount: 800, type: "income", category: "freelance", interval: "one_time", due_day: null, start_date: "2026-02-18", notes: null },
    { id: financeId(TX_PREFIX, 30), user_id: userId, name: "Groceries — Mar", amount: 210, type: "expense", category: "food", interval: "monthly", due_day: null, start_date: "2026-03-06", notes: null },
  ];

  return txs;
}

function buildDebts(userId: string) {
  return [
    {
      id: financeId(DEBT_PREFIX, 1),
      user_id: userId,
      name: "Visa Credit Line",
      type: "credit_line" as const,
      principal: 15000,
      balance: 8500,
      interest_rate: 25.99,
      min_payment: 2000,
      due_day: 15,
      lender: "TD Bank",
      notes: null,
    },
    {
      id: financeId(DEBT_PREFIX, 2),
      user_id: userId,
      name: "Student Loan",
      type: "loan" as const,
      principal: 25000,
      balance: 12000,
      interest_rate: 5.2,
      min_payment: 350,
      due_day: 1,
      lender: "NSLSC",
      notes: "Federal portion",
    },
    {
      id: financeId(DEBT_PREFIX, 3),
      user_id: userId,
      name: "MEEK Owed",
      type: "personal" as const,
      principal: 7169.24,
      balance: 7169.24,
      interest_rate: 0,
      min_payment: null,
      due_day: null,
      lender: "MEEK (personal float)",
      notes: "Reimbursable expenses advanced for MEEK project",
    },
    {
      id: financeId(DEBT_PREFIX, 4),
      user_id: userId,
      name: "Personal Bridge Loan",
      type: "personal" as const,
      principal: 700,
      balance: 700,
      interest_rate: 0,
      min_payment: null,
      due_day: null,
      lender: "Family",
      notes: "Short-term bridge — repay when Personize Mar payment lands",
    },
  ];
}

function buildCryptoBalances(userId: string) {
  return [
    {
      id: financeId(CRYPTO_PREFIX, 1),
      user_id: userId,
      symbol: "$MEEK",
      name: "MEEK Token",
      quantity: 500000,
      cost_basis: 50,
      wallet: "Phantom",
      chain: "Solana",
      liquid_amount: 300000,
      locked_amount: 200000,
      last_price_usd: 0.0003,
      last_price_updated_at: "2026-03-15T12:00:00Z",
      notes: "Community token — illiquid",
    },
    {
      id: financeId(CRYPTO_PREFIX, 2),
      user_id: userId,
      symbol: "SOL",
      name: "Solana",
      quantity: 2.5,
      cost_basis: 250,
      wallet: "Phantom",
      chain: "Solana",
      liquid_amount: 2.5,
      locked_amount: 0,
      last_price_usd: 130,
      last_price_updated_at: "2026-03-15T12:00:00Z",
      notes: null,
    },
    {
      id: financeId(CRYPTO_PREFIX, 3),
      user_id: userId,
      symbol: "USDC",
      name: "USD Coin",
      quantity: 150,
      cost_basis: 150,
      wallet: "Phantom",
      chain: "Solana",
      liquid_amount: 150,
      locked_amount: 0,
      last_price_usd: 1,
      last_price_updated_at: "2026-03-15T12:00:00Z",
      notes: null,
    },
    {
      id: financeId(CRYPTO_PREFIX, 4),
      user_id: userId,
      symbol: "ETH",
      name: "Ethereum",
      quantity: 0.1,
      cost_basis: 280,
      wallet: "MetaMask",
      chain: "Ethereum",
      liquid_amount: 0.1,
      locked_amount: 0,
      last_price_usd: 3400,
      last_price_updated_at: "2026-03-15T12:00:00Z",
      notes: null,
    },
    {
      id: financeId(CRYPTO_PREFIX, 5),
      user_id: userId,
      symbol: "BTC",
      name: "Bitcoin",
      quantity: 0.005,
      cost_basis: 350,
      wallet: "Strike",
      chain: "Bitcoin",
      liquid_amount: 0.005,
      locked_amount: 0,
      last_price_usd: 85000,
      last_price_updated_at: "2026-03-15T12:00:00Z",
      notes: "DCA purchases",
    },
  ];
}

function buildBalanceSnapshots(userId: string) {
  return [
    {
      id: financeId(SNAPSHOT_PREFIX, 1),
      user_id: userId,
      snapshot_date: "2026-01-01",
      chequing: 2800,
      savings: 500,
      credit_available: 6500,
      total_debt: 28369.24,
      net_worth: -24569.24,
      notes: "Start of year",
    },
    {
      id: financeId(SNAPSHOT_PREFIX, 2),
      user_id: userId,
      snapshot_date: "2026-01-15",
      chequing: 4100,
      savings: 500,
      credit_available: 7200,
      total_debt: 27869.24,
      net_worth: -22769.24,
      notes: "Personize retainer received",
    },
    {
      id: financeId(SNAPSHOT_PREFIX, 3),
      user_id: userId,
      snapshot_date: "2026-02-01",
      chequing: 1950,
      savings: 500,
      credit_available: 6800,
      total_debt: 27569.24,
      net_worth: -23819.24,
      notes: "After rent + subs",
    },
    {
      id: financeId(SNAPSHOT_PREFIX, 4),
      user_id: userId,
      snapshot_date: "2026-02-15",
      chequing: 3650,
      savings: 500,
      credit_available: 7000,
      total_debt: 27269.24,
      net_worth: -22119.24,
      notes: "Personize retainer received",
    },
    {
      id: financeId(SNAPSHOT_PREFIX, 5),
      user_id: userId,
      snapshot_date: "2026-03-01",
      chequing: 1600,
      savings: 500,
      credit_available: 6500,
      total_debt: 27069.24,
      net_worth: -23469.24,
      notes: "After rent + subs",
    },
    {
      id: financeId(SNAPSHOT_PREFIX, 6),
      user_id: userId,
      snapshot_date: "2026-03-15",
      chequing: 3900,
      savings: 500,
      credit_available: 6800,
      total_debt: 26869.24,
      net_worth: -21669.24,
      notes: "Personize retainer + freelance",
    },
  ];
}

function buildScheduledFlows(userId: string) {
  return [
    {
      id: financeId(FLOW_PREFIX, 1),
      user_id: userId,
      name: "Rent",
      amount: 1850,
      direction: "outflow" as const,
      cadence: "monthly" as const,
      due_day: 1,
      start_date: "2026-01-01",
      end_date: null,
      category: "rent",
      probability: 1.0,
      earliest_date: null,
      latest_date: null,
      notes: null,
      is_active: true,
    },
    {
      id: financeId(FLOW_PREFIX, 2),
      user_id: userId,
      name: "Subscriptions (bundled)",
      amount: 600,
      direction: "outflow" as const,
      cadence: "monthly" as const,
      due_day: 5,
      start_date: "2026-01-01",
      end_date: null,
      category: "subscriptions",
      probability: 1.0,
      earliest_date: null,
      latest_date: null,
      notes: "Vercel, Supabase, n8n, OpenAI, Anthropic, Cursor, GitHub, Linear, Figma, Spotify+iCloud",
      is_active: true,
    },
    {
      id: financeId(FLOW_PREFIX, 3),
      user_id: userId,
      name: "Personize retainer",
      amount: 3500,
      direction: "inflow" as const,
      cadence: "monthly" as const,
      due_day: 15,
      start_date: "2026-01-01",
      end_date: null,
      category: "personize",
      probability: 0.7,
      earliest_date: null,
      latest_date: null,
      notes: "Monthly retainer — depends on continued engagement",
      is_active: true,
    },
    {
      id: financeId(FLOW_PREFIX, 4),
      user_id: userId,
      name: "MEEK reimbursement payment",
      amount: 7169,
      direction: "inflow" as const,
      cadence: "one_time" as const,
      due_day: null,
      start_date: "2026-04-01",
      end_date: null,
      category: "meek",
      probability: 0.5,
      earliest_date: "2026-03-15",
      latest_date: "2026-06-30",
      notes: "Pending MEEK treasury approval",
      is_active: true,
    },
    {
      id: financeId(FLOW_PREFIX, 5),
      user_id: userId,
      name: "Freelance income",
      amount: 1000,
      direction: "inflow" as const,
      cadence: "monthly" as const,
      due_day: null,
      start_date: "2026-01-01",
      end_date: null,
      category: "freelance",
      probability: 0.4,
      earliest_date: null,
      latest_date: null,
      notes: "Variable — depends on pipeline",
      is_active: true,
    },
    {
      id: financeId(FLOW_PREFIX, 6),
      user_id: userId,
      name: "Groceries",
      amount: 200,
      direction: "outflow" as const,
      cadence: "biweekly" as const,
      due_day: null,
      start_date: "2026-01-01",
      end_date: null,
      category: "food",
      probability: 1.0,
      earliest_date: null,
      latest_date: null,
      notes: null,
      is_active: true,
    },
    {
      id: financeId(FLOW_PREFIX, 7),
      user_id: userId,
      name: "Faaris funds",
      amount: 15000,
      direction: "inflow" as const,
      cadence: "one_time" as const,
      due_day: null,
      start_date: "2026-04-15",
      end_date: null,
      category: "meek",
      probability: 0.3,
      earliest_date: "2026-04-01",
      latest_date: "2026-08-01",
      notes: "Potential MEEK investment from Faaris",
      is_active: true,
    },
    {
      id: financeId(FLOW_PREFIX, 8),
      user_id: userId,
      name: "Transport",
      amount: 100,
      direction: "outflow" as const,
      cadence: "monthly" as const,
      due_day: 1,
      start_date: "2026-01-01",
      end_date: null,
      category: "transport",
      probability: 1.0,
      earliest_date: null,
      latest_date: null,
      notes: "Bus pass + occasional rideshare",
      is_active: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// POST /api/admin/seed-finance
// ---------------------------------------------------------------------------

export const POST = withErrorHandler(async function POST(req: NextRequest) {
  const authError = authenticate(req);
  if (authError) return authError;

  const supabase = createServiceClient();
  const userId = await getSeedUserId(supabase);

  const results: Record<string, number> = {};

  // --- Transactions ---
  const transactions = buildTransactions(userId);
  const { error: txErr } = await supabase
    .from("transactions")
    .upsert(transactions, { onConflict: "id", ignoreDuplicates: true });
  if (txErr) {
    return NextResponse.json(
      { error: `Transactions seed failed: ${txErr.message}` },
      { status: 500 },
    );
  }
  results.transactions = transactions.length;

  // --- Debts ---
  const debts = buildDebts(userId);
  const { error: debtErr } = await supabase
    .from("debts")
    .upsert(debts, { onConflict: "id", ignoreDuplicates: true });
  if (debtErr) {
    return NextResponse.json(
      { error: `Debts seed failed: ${debtErr.message}` },
      { status: 500 },
    );
  }
  results.debts = debts.length;

  // --- Crypto Balances ---
  const crypto = buildCryptoBalances(userId);
  const { error: cryptoErr } = await supabase
    .from("crypto_balances")
    .upsert(crypto, { onConflict: "id", ignoreDuplicates: true });
  if (cryptoErr) {
    return NextResponse.json(
      { error: `Crypto balances seed failed: ${cryptoErr.message}` },
      { status: 500 },
    );
  }
  results.crypto_balances = crypto.length;

  // --- Balance Snapshots ---
  const snapshots = buildBalanceSnapshots(userId);
  const { error: snapErr } = await supabase
    .from("balance_snapshots")
    .upsert(snapshots, { onConflict: "id", ignoreDuplicates: true });
  if (snapErr) {
    return NextResponse.json(
      { error: `Balance snapshots seed failed: ${snapErr.message}` },
      { status: 500 },
    );
  }
  results.balance_snapshots = snapshots.length;

  // --- Scheduled Flows ---
  const flows = buildScheduledFlows(userId);
  const { error: flowErr } = await supabase
    .from("scheduled_flows")
    .upsert(flows, { onConflict: "id", ignoreDuplicates: true });
  if (flowErr) {
    return NextResponse.json(
      { error: `Scheduled flows seed failed: ${flowErr.message}` },
      { status: 500 },
    );
  }
  results.scheduled_flows = flows.length;

  const total = Object.values(results).reduce((sum, n) => sum + n, 0);

  return NextResponse.json({
    success: true,
    total_seeded: total,
    details: results,
  });
});
