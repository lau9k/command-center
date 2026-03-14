import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { CryptoBalance, BalanceSnapshot } from "@/lib/types/database";

type AssetClass = "cash" | "crypto" | "investments";

interface WalletEntry {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  valueCad: number;
}

interface WalletGroup {
  assetClass: AssetClass;
  wallets: WalletEntry[];
  totalCad: number;
}

interface TreasurySummary {
  netWorth: number;
  assetDistribution: { assetClass: AssetClass; valueCad: number; pct: number }[];
  walletGroups: WalletGroup[];
  monthlySnapshots: { date: string; netWorth: number }[];
}

function classifyAsset(symbol: string): AssetClass {
  const stablecoins = ["USDC", "USDT", "DAI", "BUSD"];
  if (stablecoins.includes(symbol)) return "cash";
  if (["BTC", "ETH", "SOL", "MEEK"].includes(symbol)) return "crypto";
  return "investments";
}

export async function GET() {
  try {
    const supabase = createServiceClient();

    const [holdingsResult, snapshotsResult, pricesResult] = await Promise.all([
      supabase
        .from("crypto_balances")
        .select("*")
        .order("symbol", { ascending: true }),
      supabase
        .from("balance_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: true })
        .limit(30),
      fetch(
        `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/finance/treasury/price`
      ).then((r) => r.json()) as Promise<
        Record<string, { usd: number; cad: number }>
      >,
    ]);

    if (holdingsResult.error) {
      return NextResponse.json(
        { error: holdingsResult.error.message },
        { status: 500 }
      );
    }

    const holdings = (holdingsResult.data as CryptoBalance[]) ?? [];
    const snapshots = (snapshotsResult.data as BalanceSnapshot[]) ?? [];

    // Group wallets by asset class
    const groupMap = new Map<AssetClass, WalletGroup>();

    for (const h of holdings) {
      const assetClass = classifyAsset(h.symbol);
      const price = pricesResult[h.symbol] ?? { usd: 0, cad: 0 };
      const totalQty = Number(h.liquid_amount) + Number(h.locked_amount);
      const valueCad = totalQty * price.cad;

      if (!groupMap.has(assetClass)) {
        groupMap.set(assetClass, {
          assetClass,
          wallets: [],
          totalCad: 0,
        });
      }

      const group = groupMap.get(assetClass)!;
      group.wallets.push({
        id: h.id,
        name: h.name ?? h.symbol,
        symbol: h.symbol,
        balance: totalQty,
        valueCad,
      });
      group.totalCad += valueCad;
    }

    const walletGroups = Array.from(groupMap.values());
    const netWorth = walletGroups.reduce((s, g) => s + g.totalCad, 0);

    const assetDistribution = walletGroups.map((g) => ({
      assetClass: g.assetClass,
      valueCad: g.totalCad,
      pct: netWorth > 0 ? Math.round((g.totalCad / netWorth) * 100) : 0,
    }));

    const monthlySnapshots = snapshots.map((s) => ({
      date: s.snapshot_date,
      netWorth: Number(s.net_worth ?? 0),
    }));

    const summary: TreasurySummary = {
      netWorth,
      assetDistribution,
      walletGroups,
      monthlySnapshots,
    };

    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
