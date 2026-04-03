import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";

interface PriceCache {
  prices: Record<string, { usd: number; cad: number }>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let priceCache: PriceCache | null = null;

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  USDC: "usd-coin",
  USDT: "tether",
};

async function fetchUsdCadRate(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=cad",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return 1.36; // fallback rate
    const data = await res.json();
    return data["usd-coin"]?.cad ?? 1.36;
  } catch {
    return 1.36;
  }
}

async function fetchPrices(): Promise<
  Record<string, { usd: number; cad: number }>
> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const usdCadRate = await fetchUsdCadRate();

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { next: { revalidate: 300 } }
    );

    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);
    const data = await res.json();

    const prices: Record<string, { usd: number; cad: number }> = {};

    for (const [symbol, cgId] of Object.entries(COINGECKO_IDS)) {
      const usdPrice = data[cgId]?.usd ?? 0;
      prices[symbol] = {
        usd: usdPrice,
        cad: usdPrice * usdCadRate,
      };
    }

    // MEEK is not on CoinGecko — use a placeholder price
    prices["MEEK"] = {
      usd: 0.005,
      cad: 0.005 * usdCadRate,
    };

    return prices;
  } catch {
    // Return fallback prices when API is unavailable
    const fallback: Record<string, { usd: number; cad: number }> = {
      BTC: { usd: 97000, cad: 97000 * usdCadRate },
      ETH: { usd: 3400, cad: 3400 * usdCadRate },
      SOL: { usd: 145, cad: 145 * usdCadRate },
      USDC: { usd: 1, cad: usdCadRate },
      USDT: { usd: 1, cad: usdCadRate },
      MEEK: { usd: 0.005, cad: 0.005 * usdCadRate },
    };
    return fallback;
  }
}

export const GET = withAuth(async function GET(request: NextRequest, _user) {
  const now = Date.now();

  if (priceCache && now - priceCache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json(priceCache.prices);
  }

  const prices = await fetchPrices();
  priceCache = { prices, fetchedAt: now };

  return NextResponse.json(prices);
});
