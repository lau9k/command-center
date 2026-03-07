import { createServiceClient } from "@/lib/supabase/service";
import { TreasuryDashboard } from "@/components/finance/TreasuryDashboard";
import type { CryptoBalance } from "@/lib/types/database";

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

      <TreasuryDashboard holdings={holdings} />
    </div>
  );
}
