"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DollarSign,
  Clock,
  TrendingUp,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Plus,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard, DataTable, Drawer } from "@/components/ui";
import type { ColumnDef } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  ReimbursementRequest,
  ReimbursementItem,
  ReimbursementPayment,
  ReimbursementPaymentAllocation,
  ReimbursementStatus,
  Transaction,
} from "@/lib/types/database";

// --- Constants ---
const APR = 0.2599;

const STATUS_COLORS: Record<ReimbursementStatus, string> = {
  draft: "bg-[#666666]/20 text-[#A0A0A0]",
  submitted: "bg-[#3B82F6]/20 text-[#3B82F6]",
  approved: "bg-[#EAB308]/20 text-[#EAB308]",
  paid: "bg-[#22C55E]/20 text-[#22C55E]",
};

// --- Helpers ---
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysOpen(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
}

function calcFloatCost(outstanding: number, days: number): number {
  return outstanding * APR / 365 * days;
}

// --- Status Badge ---
function ReimbursementStatusBadge({ status }: { status: ReimbursementStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        STATUS_COLORS[status]
      )}
    >
      {status}
    </span>
  );
}

// --- Props ---
interface ReimbursementsDashboardProps {
  requests: ReimbursementRequest[];
  items: ReimbursementItem[];
  payments: ReimbursementPayment[];
  allocations: ReimbursementPaymentAllocation[];
  reimbursableTransactions: Transaction[];
}

export function ReimbursementsDashboard({
  requests,
  items,
  payments,
  allocations,
}: ReimbursementsDashboardProps) {
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState<Set<string>>(new Set());
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  // New request form state
  const [newTitle, setNewTitle] = useState("");
  const [newWallet, setNewWallet] = useState("MEEK");
  const [newDescription, setNewDescription] = useState("");
  const [newItems, setNewItems] = useState<{ description: string; amount: string; expense_date: string }[]>([
    { description: "", amount: "", expense_date: new Date().toISOString().slice(0, 10) },
  ]);

  // --- Computed data ---
  const requestSummaries = useMemo(() => {
    return requests.map((r) => {
      const requestItems = items.filter((i) => i.reimbursement_request_id === r.id);
      const requestAllocations = allocations.filter(
        (a) => a.reimbursement_request_id === r.id
      );
      const amountPaid = requestAllocations.reduce((s, a) => s + Number(a.amount), 0);
      const outstanding = Number(r.total_amount) - amountPaid;
      const days = daysOpen(r.created_at);
      const floatCost = r.status !== "paid" ? calcFloatCost(outstanding, days) : 0;

      return {
        ...r,
        items: requestItems,
        amount_paid: amountPaid,
        amount_outstanding: outstanding,
        item_count: requestItems.length,
        days_open: days,
        float_cost: floatCost,
      };
    });
  }, [requests, items, allocations]);

  // Group by wallet
  const groupedByWallet = useMemo(() => {
    const map = new Map<string, typeof requestSummaries>();
    for (const r of requestSummaries) {
      const existing = map.get(r.wallet) ?? [];
      existing.push(r);
      map.set(r.wallet, existing);
    }
    return map;
  }, [requestSummaries]);

  // KPI calculations
  const totalOutstanding = useMemo(
    () => requestSummaries.filter((r) => r.status !== "paid").reduce((s, r) => s + r.amount_outstanding, 0),
    [requestSummaries]
  );

  const pendingCount = useMemo(
    () => requestSummaries.filter((r) => r.status !== "paid" && r.status !== "draft").length,
    [requestSummaries]
  );

  const avgDaysToPayment = useMemo(() => {
    const paidRequests = requestSummaries.filter((r) => r.status === "paid" && r.paid_at && r.created_at);
    if (paidRequests.length === 0) return 0;
    const totalDays = paidRequests.reduce((s, r) => {
      const created = new Date(r.created_at).getTime();
      const paid = new Date(r.paid_at!).getTime();
      return s + Math.floor((paid - created) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round(totalDays / paidRequests.length);
  }, [requestSummaries]);

  const monthlyFloatCost = useMemo(() => totalOutstanding * APR / 12, [totalOutstanding]);

  const ytdFloatCost = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return requestSummaries
      .filter((r) => r.status !== "paid")
      .reduce((s, r) => {
        const created = new Date(r.created_at);
        const effectiveStart = created > yearStart ? created : yearStart;
        const ytdDays = Math.max(
          0,
          Math.floor((now.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24))
        );
        return s + calcFloatCost(r.amount_outstanding, ytdDays);
      }, 0);
  }, [requestSummaries]);

  // --- Handlers ---
  const toggleExpanded = useCallback((id: string) => {
    setExpandedRequests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePaymentSelection = useCallback((id: string) => {
    setSelectedForPayment((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRecordPayment = useCallback(async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || selectedForPayment.size === 0) return;

    try {
      // Create payment
      const payRes = await fetch("/api/finance/reimbursement-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "00000000-0000-0000-0000-000000000000",
          amount,
          payment_date: new Date().toISOString().slice(0, 10),
          payment_method: paymentMethod || null,
          reference: paymentReference || null,
        }),
      });
      const payment = await payRes.json();

      // Build allocations — distribute proportionally among selected
      const selectedSummaries = requestSummaries.filter((r) =>
        selectedForPayment.has(r.id)
      );
      const totalSelected = selectedSummaries.reduce(
        (s, r) => s + r.amount_outstanding,
        0
      );

      let remaining = amount;
      const allocs = selectedSummaries.map((r, i) => {
        const isLast = i === selectedSummaries.length - 1;
        const proportion = totalSelected > 0 ? r.amount_outstanding / totalSelected : 0;
        const allocAmount = isLast
          ? remaining
          : Math.min(r.amount_outstanding, Math.round(amount * proportion * 100) / 100);
        remaining -= allocAmount;

        return {
          user_id: "00000000-0000-0000-0000-000000000000",
          payment_id: payment.id,
          reimbursement_request_id: r.id,
          amount: Math.max(0, allocAmount),
        };
      });

      await fetch("/api/finance/reimbursement-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allocs),
      });

      // Reset and reload
      setPaymentAmount("");
      setPaymentMethod("");
      setPaymentReference("");
      setSelectedForPayment(new Set());
      setReconciliationOpen(false);
      window.location.reload();
    } catch {
      // Error handling — in production would use toast
    }
  }, [paymentAmount, paymentMethod, paymentReference, selectedForPayment, requestSummaries]);

  const handleCreateRequest = useCallback(async () => {
    if (!newTitle.trim()) return;

    const validItems = newItems.filter((i) => i.description.trim() && parseFloat(i.amount) > 0);
    const totalAmount = validItems.reduce((s, i) => s + parseFloat(i.amount), 0);

    try {
      await fetch("/api/finance/reimbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "00000000-0000-0000-0000-000000000000",
          title: newTitle,
          description: newDescription || null,
          wallet: newWallet,
          total_amount: totalAmount,
          items: validItems.map((i) => ({
            description: i.description,
            amount: parseFloat(i.amount),
            expense_date: i.expense_date,
          })),
        }),
      });

      setNewTitle("");
      setNewWallet("MEEK");
      setNewDescription("");
      setNewItems([{ description: "", amount: "", expense_date: new Date().toISOString().slice(0, 10) }]);
      setCreateOpen(false);
      window.location.reload();
    } catch {
      // Error handling
    }
  }, [newTitle, newWallet, newDescription, newItems]);

  const handleStatusChange = useCallback(async (id: string, status: ReimbursementStatus) => {
    try {
      await fetch("/api/finance/reimbursements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      window.location.reload();
    } catch {
      // Error handling
    }
  }, []);

  // --- Line item columns ---
  const itemColumns: ColumnDef<ReimbursementItem>[] = [
    { id: "description", header: "Description", accessorKey: "description", sortable: true },
    {
      id: "amount",
      header: "Amount",
      accessorKey: "amount",
      sortable: true,
      cell: (row) => <span className="font-medium">{formatCurrency(Number(row.amount))}</span>,
    },
    {
      id: "expense_date",
      header: "Date",
      accessorKey: "expense_date",
      sortable: true,
      cell: (row) => <span className="text-[#A0A0A0]">{formatDate(row.expense_date)}</span>,
    },
  ];

  // --- Payment history columns ---
  const paymentColumns: ColumnDef<ReimbursementPayment>[] = [
    {
      id: "amount",
      header: "Amount",
      accessorKey: "amount",
      sortable: true,
      cell: (row) => (
        <span className="font-medium text-[#22C55E]">{formatCurrency(Number(row.amount))}</span>
      ),
    },
    {
      id: "payment_date",
      header: "Date",
      accessorKey: "payment_date",
      sortable: true,
      cell: (row) => <span className="text-[#A0A0A0]">{formatDate(row.payment_date)}</span>,
    },
    {
      id: "payment_method",
      header: "Method",
      accessorKey: "payment_method",
      cell: (row) => <span className="text-[#A0A0A0]">{row.payment_method ?? "—"}</span>,
    },
    {
      id: "reference",
      header: "Reference",
      accessorKey: "reference",
      cell: (row) => <span className="text-[#A0A0A0]">{row.reference ?? "—"}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle={`${pendingCount} pending requests`}
          icon={<DollarSign className="size-5" />}
        />
        <KpiCard
          label="Pending Requests"
          value={String(pendingCount)}
          subtitle={`${requests.length} total`}
          icon={<Receipt className="size-5" />}
        />
        <KpiCard
          label="Avg Days to Payment"
          value={avgDaysToPayment > 0 ? `${avgDaysToPayment}d` : "N/A"}
          icon={<Clock className="size-5" />}
        />
        <KpiCard
          label="Float Cost"
          value={formatCurrency(monthlyFloatCost)}
          subtitle={`${formatCurrency(ytdFloatCost)} YTD · 25.99% APR`}
          icon={<CreditCard className="size-5" />}
        />
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <Button
          onClick={() => setCreateOpen(true)}
          className="gap-2 bg-[#FAFAFA] text-[#141414] hover:bg-[#E0E0E0]"
        >
          <Plus className="size-4" />
          New Request
        </Button>
        <Button
          variant="outline"
          onClick={() => setReconciliationOpen(true)}
          className="gap-2 border-[#2A2A2A] text-[#A0A0A0] hover:border-[#3A3A3A] hover:text-[#FAFAFA]"
        >
          <TrendingUp className="size-4" />
          Record Payment
        </Button>
      </div>

      {/* Requests grouped by wallet */}
      {Array.from(groupedByWallet.entries()).map(([wallet, walletRequests]) => (
        <div key={wallet}>
          <h3 className="mb-3 text-sm font-semibold text-[#FAFAFA]">
            {wallet}
            <span className="ml-2 text-xs font-normal text-[#A0A0A0]">
              {walletRequests.length} request{walletRequests.length !== 1 ? "s" : ""} ·{" "}
              {formatCurrency(
                walletRequests
                  .filter((r) => r.status !== "paid")
                  .reduce((s, r) => s + r.amount_outstanding, 0)
              )}{" "}
              outstanding
            </span>
          </h3>

          <div className="overflow-hidden rounded-[12px] border border-[#2A2A2A]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A] bg-[#0A0A0A]">
                  <th className="w-8 px-4 py-3" />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#A0A0A0]">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#A0A0A0]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#A0A0A0]">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#A0A0A0]">
                    Paid
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#A0A0A0]">
                    Outstanding
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#A0A0A0]">
                    Float Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#A0A0A0]">
                    Days Open
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#A0A0A0]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {walletRequests.map((r) => (
                  <RequestRow
                    key={r.id}
                    request={r}
                    expanded={expandedRequests.has(r.id)}
                    onToggle={() => toggleExpanded(r.id)}
                    onStatusChange={handleStatusChange}
                    itemColumns={itemColumns}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {requests.length === 0 && (
        <div className="flex items-center justify-center rounded-[12px] border border-[#2A2A2A] bg-[#141414] p-12 text-sm text-[#A0A0A0]">
          No reimbursement requests yet
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#FAFAFA]">Payment History</h3>
          <DataTable
            columns={paymentColumns}
            data={payments}
            rowKey={(row) => row.id}
            pageSize={10}
          />
        </div>
      )}

      {/* Create Request Drawer */}
      <Drawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Reimbursement Request"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="border-[#2A2A2A] text-[#A0A0A0]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRequest}
              className="bg-[#FAFAFA] text-[#141414] hover:bg-[#E0E0E0]"
            >
              Create Request
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A0A0A0]">Title</label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. MEEK March 2026 Expenses"
              className="border-[#2A2A2A] bg-[#0A0A0A] text-[#FAFAFA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A0A0A0]">Wallet / Project</label>
            <Select value={newWallet} onValueChange={setNewWallet}>
              <SelectTrigger className="w-full border-[#2A2A2A] bg-[#0A0A0A] text-[#FAFAFA]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEEK">MEEK</SelectItem>
                <SelectItem value="Personize">Personize</SelectItem>
                <SelectItem value="Eventium">Eventium</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A0A0A0]">Description</label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional description"
              className="border-[#2A2A2A] bg-[#0A0A0A] text-[#FAFAFA]"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-[#A0A0A0]">Line Items</label>
              <button
                type="button"
                onClick={() =>
                  setNewItems((prev) => [
                    ...prev,
                    { description: "", amount: "", expense_date: new Date().toISOString().slice(0, 10) },
                  ])
                }
                className="text-xs text-[#3B82F6] hover:underline"
              >
                + Add item
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {newItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_110px] gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...newItems];
                      updated[idx] = { ...updated[idx], description: e.target.value };
                      setNewItems(updated);
                    }}
                    placeholder="Description"
                    className="border-[#2A2A2A] bg-[#0A0A0A] text-[#FAFAFA] text-xs"
                  />
                  <Input
                    value={item.amount}
                    onChange={(e) => {
                      const updated = [...newItems];
                      updated[idx] = { ...updated[idx], amount: e.target.value };
                      setNewItems(updated);
                    }}
                    placeholder="$0.00"
                    type="number"
                    step="0.01"
                    className="border-[#2A2A2A] bg-[#0A0A0A] text-[#FAFAFA] text-xs"
                  />
                  <Input
                    value={item.expense_date}
                    onChange={(e) => {
                      const updated = [...newItems];
                      updated[idx] = { ...updated[idx], expense_date: e.target.value };
                      setNewItems(updated);
                    }}
                    type="date"
                    className="border-[#2A2A2A] bg-[#0A0A0A] text-[#FAFAFA] text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="mt-2 text-right text-xs text-[#A0A0A0]">
              Total:{" "}
              {formatCurrency(
                newItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
              )}
            </div>
          </div>
        </div>
      </Drawer>

      {/* Reconciliation Drawer */}
      <Drawer
        open={reconciliationOpen}
        onClose={() => setReconciliationOpen(false)}
        title="Record Payment"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setReconciliationOpen(false)}
              className="border-[#2A2A2A] text-[#A0A0A0]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={selectedForPayment.size === 0 || !paymentAmount}
              className="bg-[#22C55E] text-[#141414] hover:bg-[#16A34A] disabled:opacity-50"
            >
              Record Payment
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A0A0A0]">Payment Amount</label>
            <Input
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="$0.00"
              type="number"
              step="0.01"
              className="border-[#2A2A2A] bg-[#0A0A0A] text-[#FAFAFA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A0A0A0]">Payment Method</label>
            <Input
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="e.g. e-Transfer, cheque"
              className="border-[#2A2A2A] bg-[#0A0A0A] text-[#FAFAFA]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A0A0A0]">Reference</label>
            <Input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g. Transfer ID"
              className="border-[#2A2A2A] bg-[#0A0A0A] text-[#FAFAFA]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-[#A0A0A0]">
              Allocate to Requests
            </label>
            <div className="flex flex-col gap-2">
              {requestSummaries
                .filter((r) => r.status !== "paid")
                .map((r) => (
                  <label
                    key={r.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                      selectedForPayment.has(r.id)
                        ? "border-[#3B82F6] bg-[#3B82F6]/10"
                        : "border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A]"
                    )}
                  >
                    <Checkbox
                      checked={selectedForPayment.has(r.id)}
                      onCheckedChange={() => togglePaymentSelection(r.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#FAFAFA]">{r.title}</p>
                      <p className="text-xs text-[#A0A0A0]">
                        Outstanding: {formatCurrency(r.amount_outstanding)}
                      </p>
                    </div>
                    <ReimbursementStatusBadge status={r.status} />
                  </label>
                ))}
            </div>
          </div>

          {selectedForPayment.size > 0 && (
            <div className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-3 text-xs text-[#A0A0A0]">
              <p>
                Selected total outstanding:{" "}
                <span className="text-[#FAFAFA]">
                  {formatCurrency(
                    requestSummaries
                      .filter((r) => selectedForPayment.has(r.id))
                      .reduce((s, r) => s + r.amount_outstanding, 0)
                  )}
                </span>
              </p>
              <p className="mt-1">
                Payment will be proportionally allocated across selected requests.
                Partial payments are supported.
              </p>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
}

// --- Expandable Request Row ---
function RequestRow({
  request,
  expanded,
  onToggle,
  onStatusChange,
  itemColumns,
}: {
  request: {
    id: string;
    title: string;
    status: ReimbursementStatus;
    total_amount: number;
    amount_paid: number;
    amount_outstanding: number;
    float_cost: number;
    days_open: number;
    items: ReimbursementItem[];
  };
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: ReimbursementStatus) => void;
  itemColumns: ColumnDef<ReimbursementItem>[];
}) {
  const nextStatus: Record<ReimbursementStatus, ReimbursementStatus | null> = {
    draft: "submitted",
    submitted: "approved",
    approved: "paid",
    paid: null,
  };

  const next = nextStatus[request.status];

  return (
    <>
      <tr
        className="border-b border-[#2A2A2A] bg-[#141414] transition-colors hover:bg-[#1E1E1E] cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          {expanded ? (
            <ChevronDown className="size-4 text-[#A0A0A0]" />
          ) : (
            <ChevronRight className="size-4 text-[#A0A0A0]" />
          )}
        </td>
        <td className="px-4 py-3 text-[#FAFAFA] font-medium">{request.title}</td>
        <td className="px-4 py-3">
          <ReimbursementStatusBadge status={request.status} />
        </td>
        <td className="px-4 py-3 text-[#FAFAFA]">{formatCurrency(Number(request.total_amount))}</td>
        <td className="px-4 py-3 text-[#22C55E]">
          {request.amount_paid > 0 ? formatCurrency(request.amount_paid) : "—"}
        </td>
        <td className="px-4 py-3">
          <span className={cn("font-medium", request.amount_outstanding > 0 ? "text-[#EF4444]" : "text-[#22C55E]")}>
            {formatCurrency(request.amount_outstanding)}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-[#F97316]">
            {request.float_cost > 0 ? formatCurrency(request.float_cost) : "—"}
          </span>
        </td>
        <td className="px-4 py-3 text-[#A0A0A0]">
          {request.status !== "paid" ? `${request.days_open}d` : "—"}
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {next && (
            <button
              onClick={() => onStatusChange(request.id, next)}
              className="rounded-md bg-[#1E1E1E] px-2.5 py-1 text-xs font-medium text-[#3B82F6] transition-colors hover:bg-[#2A2A2A]"
            >
              Mark {next}
            </button>
          )}
        </td>
      </tr>
      {expanded && request.items.length > 0 && (
        <tr>
          <td colSpan={9} className="bg-[#0A0A0A] px-8 py-4">
            <p className="mb-2 text-xs font-medium text-[#A0A0A0]">
              Line Items ({request.items.length})
            </p>
            <DataTable
              columns={itemColumns}
              data={request.items}
              rowKey={(row) => row.id}
              pageSize={20}
            />
          </td>
        </tr>
      )}
    </>
  );
}
