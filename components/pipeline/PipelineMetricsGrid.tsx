import { Clock } from "lucide-react";

interface StageMetric {
  stage_id: string;
  stage_name: string;
  stage_slug: string;
  color: string | null;
  count: number;
  total_value: number;
  avg_value: number;
  avg_days: number;
  conversion_rate: number;
}

interface PipelineMetricsGridProps {
  data: StageMetric[];
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export function PipelineMetricsGrid({ data }: PipelineMetricsGridProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No stage data available</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Stage
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Deals
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Avg Value
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                Avg Days
              </span>
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Conversion
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((stage) => (
            <tr
              key={stage.stage_id}
              className="border-b border-border last:border-b-0"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: stage.color ?? "#3B82F6" }}
                  />
                  <span className="font-medium text-foreground">
                    {stage.stage_name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-foreground">
                {stage.count}
              </td>
              <td className="px-4 py-3 text-right text-foreground">
                {formatCurrency(stage.avg_value)}
              </td>
              <td className="px-4 py-3 text-right text-foreground">
                {stage.avg_days} <span className="text-muted-foreground">d</span>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${stage.conversion_rate}%`,
                        backgroundColor: stage.color ?? "#3B82F6",
                      }}
                    />
                  </div>
                  <span className="min-w-[3ch] font-medium text-foreground">
                    {stage.conversion_rate}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
