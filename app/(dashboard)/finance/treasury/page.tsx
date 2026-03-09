import { createServiceClient } from "@/lib/supabase/service";
import { TreasuryDashboardLazy } from "@/components/finance/TreasuryDashboardLazy";
import type { CryptoBalance } from "@/lib/types/database";

export const revalidate = 60;

export default async function TreasuryPage() {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("crypto_balances")
    .select("*")
    .order("symbol", { ascending: true });

  const holdings: CryptoBalance[] = (data as CryptoBalance[]) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Treasury</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crypto holdings, market value, and token structure
        </p>
      </div>

      <TreasuryDashboardLazy holdings={holdings} />
    </div>
  );
}
