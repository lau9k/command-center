"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { TransactionDetailDrawer } from "@/components/finance/TransactionDetailDrawer";
import { WalletViewSwitcher } from "./FinanceFilters";
import { FinanceSummaryCards } from "./FinanceSummaryCards";
import { FinanceCharts } from "./FinanceCharts";
import { TransactionTableSection } from "./TransactionTable";
import { UpcomingPaymentsSection } from "./UpcomingPayments";
import { useFinanceData } from "./useFinanceData";
import type {
  WalletView,
  FilterValues,
  Transaction,
  Debt,
  BalanceSnapshot,
  ReimbursementRequest,
} from "./types";

export function FinanceDashboard() {
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["finance", "transactions"],
  });
  const { data: debts = [] } = useQuery<Debt[]>({
    queryKey: ["finance", "debts"],
  });
  const { data: snapshots = [] } = useQuery<BalanceSnapshot[]>({
    queryKey: ["finance", "snapshots"],
  });
  const { data: reimbursementRequests = [] } = useQuery<ReimbursementRequest[]>(
    {
      queryKey: ["finance", "reimbursements"],
    }
  );

  const [walletView, setWalletView] = useState<WalletView>("overview");
  const [filterValues, setFilterValues] = useState<FilterValues>({
    category: [],
    interval: [],
  });
  const [truePersonalSpend, setTruePersonalSpend] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTransactionClick = useCallback((row: Transaction) => {
    setSelectedTransaction(row);
    setDrawerOpen(true);
  }, []);

  const {
    latestSnapshot,
    monthlyExpenses,
    monthlyIncome,
    totalDebt,
    monthlySavings,
    monthlyEssentials,
    weeklyBudget,
    weeklySpent,
    paymentGroups,
    outstandingReimbursements,
    receivedReimbursements,
    totalOutstanding,
    totalReceived,
    categoryBreakdown,
    barData,
    rollingBurnData,
    displayedTransactions,
  } = useFinanceData(
    transactions,
    debts,
    snapshots,
    reimbursementRequests,
    truePersonalSpend,
    walletView,
    filterValues
  );

  return (
    <div className="flex flex-col gap-6">
      <WalletViewSwitcher
        walletView={walletView}
        onWalletViewChange={setWalletView}
        truePersonalSpend={truePersonalSpend}
        onTruePersonalSpendChange={setTruePersonalSpend}
      />

      <FinanceSummaryCards
        walletView={walletView}
        monthlyIncome={monthlyIncome}
        monthlyExpenses={monthlyExpenses}
        monthlySavings={monthlySavings}
        monthlyEssentials={monthlyEssentials}
        weeklyBudget={weeklyBudget}
        weeklySpent={weeklySpent}
        totalDebt={totalDebt}
        debtCount={debts.length}
        latestSnapshot={latestSnapshot}
      />

      {walletView !== "debts" && (
        <FinanceCharts
          categoryBreakdown={categoryBreakdown}
          barData={barData}
          rollingBurnData={rollingBurnData}
          showOverviewChart={walletView === "overview"}
        />
      )}

      {walletView !== "debts" && (
        <UpcomingPaymentsSection
          paymentGroups={paymentGroups}
          outstandingReimbursements={outstandingReimbursements}
          receivedReimbursements={receivedReimbursements}
          totalOutstanding={totalOutstanding}
          totalReceived={totalReceived}
        />
      )}

      <TransactionTableSection
        walletView={walletView}
        debts={debts}
        displayedTransactions={displayedTransactions}
        filterValues={filterValues}
        onFilterChange={setFilterValues}
        onRowClick={handleTransactionClick}
      />

      <TransactionDetailDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        reimbursementRequests={reimbursementRequests}
        onUpdate={() => window.location.reload()}
      />
    </div>
  );
}
