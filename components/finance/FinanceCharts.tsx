import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  formatCurrency,
  formatCurrencyFull,
  cssVar,
} from "./types";

// --- Custom tooltip ---
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; payload?: { fill?: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 text-muted-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-foreground">
          {p.name}: {formatCurrencyFull(p.value)}
        </p>
      ))}
    </div>
  );
}

interface CategoryEntry {
  name: string;
  value: number;
  fill: string;
}

interface BarEntry {
  name: string;
  amount: number;
  fill: string;
}

interface RollingBurnEntry {
  month: string;
  expenses: number;
  income: number;
  rollingAvg: number;
}

interface FinanceChartsProps {
  categoryBreakdown: CategoryEntry[];
  barData: BarEntry[];
  rollingBurnData: RollingBurnEntry[];
  showOverviewChart: boolean;
}

export function FinanceCharts({
  categoryBreakdown,
  barData,
  rollingBurnData,
  showOverviewChart,
}: FinanceChartsProps) {
  return (
    <>
      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Spending Breakdown Pie */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Spending Breakdown
          </h3>
          {categoryBreakdown.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {categoryBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-1 flex-col gap-1.5">
                {categoryBreakdown.slice(0, 8).map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ backgroundColor: c.fill }}
                      />
                      <span className="capitalize text-muted-foreground">
                        {c.name}
                      </span>
                    </span>
                    <span className="text-foreground">
                      {formatCurrency(c.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No expense data
            </p>
          )}
        </div>

        {/* Where Your Money Goes Bar Chart */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Where Your Money Goes
          </h3>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical">
                <XAxis
                  type="number"
                  tick={{ fill: cssVar("--chart-tick", "#737373"), fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(v)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: cssVar("--chart-legend", "#A0A0A0"), fontSize: 11 }}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No expense data
            </p>
          )}
        </div>
      </div>

      {/* Monthly Income vs Expenses Chart */}
      {showOverviewChart && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            Monthly Income vs Expenses
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Cyan line = 3-month trend
          </p>
          {rollingBurnData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={rollingBurnData}>
                <XAxis
                  dataKey="month"
                  tick={{ fill: cssVar("--chart-tick", "#737373"), fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: cssVar("--chart-tick", "#737373"), fontSize: 11 }}
                  tickFormatter={(v) => formatCurrency(v)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#22C55E"
                  fillOpacity={0.3}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#EF4444"
                  fillOpacity={0.3}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="rollingAvg"
                  name="3-Mo Avg Expenses"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Need at least 2 months of data to show trends
            </p>
          )}
        </div>
      )}
    </>
  );
}
