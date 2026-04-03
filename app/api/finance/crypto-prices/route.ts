import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

const SYMBOL_TO_COINGECKO: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  BUSD: "binance-usd",
};

export const POST = withErrorHandler(withAuth(async function POST(_request: NextRequest, _user) {
  const supabase = createServiceClient();

  // 1. Get distinct symbols from crypto_balances
  const { data: balances, error: fetchError } = await supabase
    .from("crypto_balances")
    .select("id, symbol");

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!balances || balances.length === 0) {
    return NextResponse.json({ updated: 0, prices: {} });
  }

  // 2. Map symbols to CoinGecko IDs (skip unknown tokens)
  const symbolSet = new Set(balances.map((b) => b.symbol));
  const symbolToId = new Map<string, string>();
  for (const symbol of symbolSet) {
    const geckoId = SYMBOL_TO_COINGECKO[symbol];
    if (geckoId) {
      symbolToId.set(symbol, geckoId);
    }
  }

  if (symbolToId.size === 0) {
    return NextResponse.json({ updated: 0, prices: {}, skipped: Array.from(symbolSet) });
  }

  // 3. Fetch prices from CoinGecko
  const geckoIds = Array.from(symbolToId.values()).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds}&vs_currencies=usd`;

  const response = await fetch(url);

  if (response.status === 429) {
    return NextResponse.json(
      { error: "CoinGecko rate limit reached. Please try again in a minute." },
      { status: 429 }
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: `CoinGecko API error: ${response.status}` },
      { status: 502 }
    );
  }

  const geckoData: Record<string, { usd: number }> = await response.json();

  // 4. Update each balance row
  const prices: Record<string, number> = {};
  const now = new Date().toISOString();
  let updated = 0;

  for (const balance of balances) {
    const geckoId = SYMBOL_TO_COINGECKO[balance.symbol];
    if (!geckoId || !geckoData[geckoId]) continue;

    const priceUsd = geckoData[geckoId].usd;
    prices[balance.symbol] = priceUsd;

    const { error: updateError } = await supabase
      .from("crypto_balances")
      .update({
        last_price_usd: priceUsd,
        last_price_updated_at: now,
        updated_at: now,
      })
      .eq("id", balance.id);

    if (!updateError) {
      updated++;
    }
  }

  const skipped = Array.from(symbolSet).filter((s) => !SYMBOL_TO_COINGECKO[s]);

  return NextResponse.json({ updated, prices, skipped });
}));
