"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Coins,
  DollarSign,
  Lock,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { KpiCard, DataTable } from "@/components/ui";
import type { ColumnDef } from "@/components/ui";
import type { CryptoBalance } from "@/lib/types/database";

// --- Helpers ---

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatQuantity(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  if (amount < 1) return amount.toFixed(6);
  return amount.toLocaleString("en-CA", { maximumFractionDigits: 2 });
}

// --- Types ---

type Prices = Record<string, { usd: number; cad: number }>;

interface HoldingRow {
  id: string;
  symbol: string;
  name: string;
  chain: string;
  liquid: number;
  locked: number;
  price_cad: number;
  market_value_cad: number;
  wallet: string;
}

// --- Chart colors ---

const STRUCTURE_COLORS: Record<string, string> = {
  "Project Token": "#8B5CF6",
  Stablecoins: "#22C55E",
  Other: "#3B82F6",
};

const PIE_COLORS = ["#8B5CF6", "#22C55E", "#3B82F6", "#EAB308", "#EC4899"];

// --- Tooltip ---

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {payload.map((p, i) => (
        <p key={i} className="text-foreground">
          {p.name}: {formatCurrencyFull(p.value)}
        </p>
      ))}
    </div>
  );
}

// --- Vesting timeline ---

interface VestingEvent {
  label: string;
  amount: number;
  unlockDate: string;
  pctOfTotal: number;
}

function VestingTimeline({ events }: { events: VestingEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Vesting Timeline
      </h3>
      <div className="space-y-3">
        {events.map((evt, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-28 shrink-0 text-xs text-muted-foreground">
              {new Date(evt.unlockDate + "T00:00:00").toLocaleDateString(
                "en-CA",
                { month: "short", year: "numeric" }
              )}
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-foreground">{evt.label}</span>
                <span className="text-xs text-muted-foreground">
                  {formatQuantity(evt.amount)} tokens
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
                <div
                  className="h-full rounded-full bg-[#8B5CF6]"
                  style={{ width: `${Math.min(evt.pctOfTotal, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Columns ---

const COLUMNS: ColumnDef<HoldingRow>[] = [
  {
    id: "symbol",
    header: "Token",
    accessorKey: "symbol",
    sortable: true,
    cell: (row) => (
      <div>
        <span className="font-medium text-foreground">{row.symbol}</span>
        <span className="ml-2 text-xs text-muted-foreground">{row.name}</span>
      </div>
    ),
  },
  {
    id: "chain",
    header: "Chain",
    accessorKey: "chain",
    sortable: true,
    cell: (row) => (
      <span className="capitalize text-muted-foreground">{row.chain}</span>
    ),
  },
  {
    id: "liquid",
    header: "Liquid",
    accessorKey: "liquid",
    sortable: true,
    cell: (row) => (
      <span className="text-foreground">{formatQuantity(row.liquid)}</span>
    ),
  },
  {
    id: "locked",
    header: "Locked",
    accessorKey: "locked",
    sortable: true,
    cell: (row) => (
      <span className={row.locked > 0 ? "text-[#EAB308]" : "text-muted-foreground"}>
        {row.locked > 0 ? formatQuantity(row.locked) : "—"}
      </span>
    ),
  },
  {
    id: "price_cad",
    header: "Price",
    accessorKey: "price_cad",
    sortable: true,
    cell: (row) => (
      <span className="text-foreground">{formatCurrencyFull(row.price_cad)}</span>
    ),
  },
  {
    id: "market_value_cad",
    header: "Market Value (CAD)",
    accessorKey: "market_value_cad",
    sortable: true,
    cell: (row) => (
      <span className="font-medium text-foreground">
        {formatCurrency(row.market_value_cad)}
      </span>
    ),
  },
];

// --- Main component ---

interface TreasuryDashboardProps {
  holdings: CryptoBalance[];
}

export function TreasuryDashboard({ holdings }: TreasuryDashboardProps) {
  const [prices, setPrices] = useState<Prices>({});
  const [walletFilter, setWalletFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/finance/treasury/price")
      .then((r) => r.json())
      .then((data: Prices) => setPrices(data))
      .catch(() => {});
  }, []);

  const wallets = useMemo(() => {
    const set = new Set(holdings.map((h) => h.wallet ?? "Unknown"));
    return ["all", ...Array.from(set).sort()];
  }, [holdings]);

  const filtered = useMemo(
    () =>
      walletFilter === "all"
        ? holdings
        : holdings.filter((h) => (h.wallet ?? "Unknown") === walletFilter),
    [holdings, walletFilter]
  );

  const rows: HoldingRow[] = useMemo(
    () =>
      filtered.map((h) => {
        const price = prices[h.symbol] ?? { usd: 0, cad: 0 };
        const totalQty = Number(h.liquid_amount) + Number(h.locked_amount);
        return {
          id: h.id,
          symbol: h.symbol,
          name: h.name ?? h.symbol,
          chain: h.chain ?? "unknown",
          liquid: Number(h.liquid_amount),
          locked: Number(h.locked_amount),
          price_cad: price.cad,
          market_value_cad: totalQty * price.cad,
          wallet: h.wallet ?? "Unknown",
        };
      }),
    [filtered, prices]
  );

  const totalMarketValue = useMemo(
    () => rows.reduce((s, r) => s + r.market_value_cad, 0),
    [rows]
  );

  const totalLiquid = useMemo(
    () =>
      rows.reduce((s, r) => s + r.liquid * (prices[r.symbol]?.cad ?? 0), 0),
    [rows, prices]
  );

  const totalLocked = useMemo(
    () =>
      rows.reduce((s, r) => s + r.locked * (prices[r.symbol]?.cad ?? 0), 0),
    [rows, prices]
  );

  const liquidPct =
    totalMarketValue > 0
      ? Math.round((totalLiquid / totalMarketValue) * 100)
      : 0;
  const lockedPct = totalMarketValue > 0 ? 100 - liquidPct : 0;

  const totalHoldings = useMemo(
    () => rows.reduce((s, r) => s + r.liquid + r.locked, 0),
    [rows]
  );

  // Structure donut data
  const structureData = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const r of rows) {
      const isProjectToken = r.symbol === "MEEK";
      const isStable = ["USDC", "USDT", "DAI", "BUSD"].includes(r.symbol);
      const category = isProjectToken
        ? "Project Token"
        : isStable
          ? "Stablecoins"
          : "Other";
      groups[category] = (groups[category] ?? 0) + r.market_value_cad;
    }
    return Object.entries(groups)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        fill: STRUCTURE_COLORS[name] ?? "#666666",
      }));
  }, [rows]);

  // Vesting events (derived from locked holdings)
  const vestingEvents: VestingEvent[] = useMemo(() => {
    const lockedHoldings = filtered.filter(
      (h) => Number(h.locked_amount) > 0
    );
    if (lockedHoldings.length === 0) return [];

    return lockedHoldings.map((h) => {
      const totalQty = Number(h.liquid_amount) + Number(h.locked_amount);
      return {
        label: `${h.symbol} unlock`,
        amount: Number(h.locked_amount),
        unlockDate: "2026-10-01", // Q4 2026 per seed notes
        pctOfTotal: totalQty > 0 ? (Number(h.locked_amount) / totalQty) * 100 : 0,
      };
    });
  }, [filtered]);

  return (
    <div className="flex flex-col gap-6">
      {/* Wallet filter */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
        {wallets.map((w) => (
          <button
            key={w}
            onClick={() => setWalletFilter(w)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              walletFilter === w
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Wallet className="size-4" />
            {w === "all" ? "All Wallets" : w}
          </button>
        ))}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Holdings"
          value={formatQuantity(totalHoldings)}
          subtitle={`${rows.length} tokens`}
          icon={<Coins className="size-5" />}
        />
        <KpiCard
          label="Market Value (CAD)"
          value={formatCurrency(totalMarketValue)}
          icon={<DollarSign className="size-5" />}
        />
        <KpiCard
          label="Liquid vs Locked"
          value={`${liquidPct}% / ${lockedPct}%`}
          subtitle={`${formatCurrency(totalLiquid)} liquid`}
          icon={<Lock className="size-5" />}
        />
        <KpiCard
          label="Total Cost Basis"
          value={formatCurrency(
            filtered.reduce((s, h) => s + Number(h.cost_basis ?? 0), 0)
          )}
          subtitle={
            totalMarketValue > 0
              ? `${totalMarketValue > filtered.reduce((s, h) => s + Number(h.cost_basis ?? 0), 0) ? "+" : ""}${formatCurrency(totalMarketValue - filtered.reduce((s, h) => s + Number(h.cost_basis ?? 0), 0))} unrealized`
              : undefined
          }
          icon={<TrendingUp className="size-5" />}
        />
      </div>

      {/* Holdings table + Structure donut */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Holdings table (2/3) */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Holdings
          </h3>
          <DataTable columns={COLUMNS} data={rows} pageSize={10} />
        </div>

        {/* Structure donut (1/3) */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Structure
          </h3>
          {structureData.length > 0 ? (
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={structureData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {structureData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.fill ?? PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-3">
                {structureData.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {entry.name}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-center text-lg font-bold text-foreground">
                {formatCurrency(totalMarketValue)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No holdings data</p>
          )}
        </div>
      </div>

      {/* Vesting timeline */}
      <VestingTimeline events={vestingEvents} />
    </div>
  );
}
