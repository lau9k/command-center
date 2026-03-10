import { Layers, DollarSign, TrendingUp, Target } from "lucide-react";
import { KpiCard } from "@/components/ui";

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

interface PipelineKPIStripProps {
  totalDeals: number;
  totalValue: number;
  avgDealSize: number;
  winRate: number;
}

export function PipelineKPIStrip({
  totalDeals,
  totalValue,
  avgDealSize,
  winRate,
}: PipelineKPIStripProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label="Total Deals"
        value={totalDeals.toString()}
        icon={<Layers className="size-5" />}
      />
      <KpiCard
        label="Total Value"
        value={formatCurrency(totalValue)}
        icon={<DollarSign className="size-5" />}
      />
      <KpiCard
        label="Avg Deal Size"
        value={formatCurrency(avgDealSize)}
        icon={<TrendingUp className="size-5" />}
      />
      <KpiCard
        label="Win Rate"
        value={`${winRate}%`}
        icon={<Target className="size-5" />}
      />
    </div>
  );
}
