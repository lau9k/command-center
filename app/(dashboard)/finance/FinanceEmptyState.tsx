"use client";

import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export function FinanceEmptyState() {
  const router = useRouter();

  return (
    <EmptyState
      icon={<Wallet />}
      title="No wallets configured"
      description="Add a wallet to start tracking your finances."
      actionLabel="+ Add Wallet"
      onAction={() => router.push("/settings")}
    />
  );
}
