import { createServiceClient } from "@/lib/supabase/service";
import { TreasuryDashboardLazy } from "@/components/finance/TreasuryDashboardLazy";
import type { CryptoBalance, BalanceSnapshot } from "@/lib/types/database";

export const revalidate = 60;

export default async function TreasuryPage() {
  const supabase = createServiceClient();

  const [holdingsResult, snapshotsResult] = await Promise.all([
    supabase
      .from("crypto_balances")
      .select("*")
      .order("symbol", { ascending: true }),
    supabase
      .from("balance_snapshots")
      .select("*")
      .order("snapshot_date", { ascending: false })
      .limit(30),
  ]);

  const holdings: CryptoBalance[] =
    (holdingsResult.data as CryptoBalance[]) ?? [];
  const snapshots: BalanceSnapshot[] =
    (snapshotsResult.data as BalanceSnapshot[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Treasury</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crypto holdings, market value, and token structure
        </p>
      </div>

      <TreasuryDashboardLazy holdings={holdings} snapshots={snapshots} />
    </div>
  );
}
