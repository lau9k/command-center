"use client";

import { useMemo } from "react";
import { Wallet, Landmark, TrendingUp, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

type AssetClass = "cash" | "crypto" | "investments";

interface WalletEntry {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  valueCad: number;
}

interface WalletGroupData {
  assetClass: AssetClass;
  wallets: WalletEntry[];
  totalCad: number;
}

interface WalletAggregationCardProps {
  walletGroups: WalletGroupData[];
}

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

const ASSET_CLASS_META: Record<
  AssetClass,
  { label: string; color: string; icon: typeof Wallet }
> = {
  cash: { label: "Cash & Stablecoins", color: "#22C55E", icon: Landmark },
  crypto: { label: "Crypto Assets", color: "#8B5CF6", icon: Coins },
  investments: { label: "Investments", color: "#3B82F6", icon: TrendingUp },
};

// --- Component ---

export function WalletAggregationCard({
  walletGroups,
}: WalletAggregationCardProps) {
  const totalValue = useMemo(
    () => walletGroups.reduce((s, g) => s + g.totalCad, 0),
    [walletGroups]
  );

  if (walletGroups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <Wallet className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          No wallets configured
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add crypto holdings to see your wallet aggregation
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {walletGroups.map((group) => {
        const meta = ASSET_CLASS_META[group.assetClass];
        const Icon = meta.icon;
        const pct =
          totalValue > 0
            ? Math.round((group.totalCad / totalValue) * 100)
            : 0;

        return (
          <div
            key={group.assetClass}
            className="rounded-lg border border-border bg-card p-5"
          >
            {/* Group header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="flex size-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${meta.color}15` }}
                >
                  <Icon className="size-4" style={{ color: meta.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {meta.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {group.wallets.length} asset
                    {group.wallets.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">
                  {formatCurrency(group.totalCad)}
                </p>
                <p className="text-xs text-muted-foreground">{pct}%</p>
              </div>
            </div>

            {/* Proportion bar */}
            <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-accent">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: meta.color,
                }}
              />
            </div>

            {/* Individual wallets */}
            <div className="space-y-2">
              {group.wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={cn(
                    "flex items-center justify-between rounded-md px-3 py-2",
                    "bg-background/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {wallet.symbol}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {wallet.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrencyFull(wallet.valueCad)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatQuantity(wallet.balance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
