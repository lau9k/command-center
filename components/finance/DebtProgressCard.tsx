"use client";

import type { DebtWithProjections } from "@/lib/types/database";

function getPayoffProgress(principal: number, balance: number): number {
  if (principal <= 0) return 0;
  const paid = principal - balance;
  if (paid <= 0) return 0;
  return Math.min((paid / principal) * 100, 100);
}

function getProgressColor(pct: number): string {
  if (pct < 25) return "#EF4444"; // red
  if (pct < 75) return "#EAB308"; // yellow
  return "#22C55E"; // green
}

interface DebtPayoffProgressProps {
  debt: DebtWithProjections;
}

export function DebtPayoffProgress({ debt }: DebtPayoffProgressProps) {
  const principal = Number(debt.principal);
  const balance = Number(debt.balance);
  const progress = getPayoffProgress(principal, balance);
  const color = getProgressColor(progress);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Payoff Progress</span>
        <span style={{ color }} className="font-medium">
          {progress.toFixed(1)}% paid off
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${progress}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}
