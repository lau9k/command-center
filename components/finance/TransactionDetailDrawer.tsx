"use client";

import { useState, useCallback, useEffect } from "react";
import { Drawer } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Split, Plus, Trash2 } from "lucide-react";
import type { Transaction, ReimbursementRequest } from "@/lib/types/database";

interface SplitAllocation {
  wallet: string;
  amount: number;
}

interface TransactionDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  reimbursementRequests: ReimbursementRequest[];
  splitMembers?: Transaction[];
  onUpdate?: () => void;
}

export function TransactionDetailDrawer({
  open,
  onClose,
  transaction,
  reimbursementRequests,
  splitMembers = [],
  onUpdate,
}: TransactionDetailDrawerProps) {
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [splitAllocations, setSplitAllocations] = useState<SplitAllocation[]>(
    []
  );
  const [showSplitEditor, setShowSplitEditor] = useState(false);

  useEffect(() => {
    if (transaction) {
      setIsReimbursable(
        (transaction as Transaction & { is_reimbursable?: boolean })
          .is_reimbursable ?? false
      );
      setSelectedRequestId(
        (
          transaction as Transaction & { reimbursement_request_id?: string }
        ).reimbursement_request_id ?? ""
      );

      // Populate split allocations from existing split members
      if (splitMembers.length > 0) {
        setSplitAllocations(
          splitMembers.map((m) => ({
            wallet: m.category ?? "default",
            amount: Number(m.amount),
          }))
        );
        setShowSplitEditor(true);
      } else {
        setSplitAllocations([]);
        setShowSplitEditor(false);
      }
    }
  }, [transaction, splitMembers]);

  const handleSave = useCallback(async () => {
    if (!transaction) return;
    setSaving(true);
    try {
      await fetch("/api/finance/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: transaction.id,
          is_reimbursable: isReimbursable,
          reimbursement_request_id:
            isReimbursable && selectedRequestId ? selectedRequestId : null,
        }),
      });
      onUpdate?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }, [transaction, isReimbursable, selectedRequestId, onClose, onUpdate]);

  const handleAddSplit = useCallback(() => {
    setSplitAllocations((prev) => [...prev, { wallet: "", amount: 0 }]);
  }, []);

  const handleRemoveSplit = useCallback((index: number) => {
    setSplitAllocations((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSplitChange = useCallback(
    (index: number, field: keyof SplitAllocation, value: string | number) => {
      setSplitAllocations((prev) =>
        prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
      );
    },
    []
  );

  if (!transaction) return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(amount);

  const totalSplitAmount = splitAllocations.reduce(
    (s, a) => s + Number(a.amount),
    0
  );
  const splitRemaining = Number(transaction.amount) - totalSplitAmount;
  const isSplit = !!transaction.split_group_id;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Transaction Details"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#2A2A2A] text-[#A0A0A0]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#FAFAFA] text-[#141414] hover:bg-[#E0E0E0]"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Transaction info */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-[#A0A0A0]">Name</p>
            <p className="text-sm font-medium text-[#FAFAFA]">
              {transaction.name}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-[#A0A0A0]">Amount</p>
              <p className="text-sm font-medium text-[#FAFAFA]">
                {formatCurrency(Number(transaction.amount))}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#A0A0A0]">Type</p>
              <p className="text-sm font-medium capitalize text-[#FAFAFA]">
                {transaction.type}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-[#A0A0A0]">Category</p>
              <p className="text-sm capitalize text-[#FAFAFA]">
                {(transaction.category ?? "—").replace(/_/g, " ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#A0A0A0]">Interval</p>
              <p className="text-sm capitalize text-[#FAFAFA]">
                {transaction.interval.replace(/_/g, " ")}
              </p>
            </div>
          </div>
          {transaction.notes && (
            <div>
              <p className="text-xs text-[#A0A0A0]">Notes</p>
              <p className="text-sm text-[#FAFAFA]">{transaction.notes}</p>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-[#2A2A2A]" />

        {/* Split badge */}
        {isSplit && (
          <div className="flex items-center gap-2 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/5 px-3 py-2">
            <Split className="size-4 text-[#3B82F6]" />
            <span className="text-xs font-medium text-[#3B82F6]">
              Split across {splitMembers.length || "multiple"} wallets
            </span>
          </div>
        )}

        {/* Split breakdown */}
        {(isSplit || showSplitEditor) && splitAllocations.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-[#A0A0A0]">
                Split Breakdown
              </p>
              <button
                onClick={handleAddSplit}
                className="flex items-center gap-1 text-xs text-[#3B82F6] hover:text-[#60A5FA]"
              >
                <Plus className="size-3" />
                Add
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {splitAllocations.map((alloc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={alloc.wallet}
                    onChange={(e) =>
                      handleSplitChange(i, "wallet", e.target.value)
                    }
                    placeholder="Wallet/category"
                    className="flex-1 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-1.5 text-xs text-[#FAFAFA] outline-none placeholder:text-[#666666]"
                  />
                  <input
                    type="number"
                    value={alloc.amount || ""}
                    onChange={(e) =>
                      handleSplitChange(
                        i,
                        "amount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0.00"
                    className="w-24 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-1.5 text-xs text-[#FAFAFA] outline-none placeholder:text-[#666666]"
                  />
                  <button
                    onClick={() => handleRemoveSplit(i)}
                    className="rounded p-1 text-[#666666] hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A0A0A0]">Remaining</span>
                <span
                  className={
                    Math.abs(splitRemaining) < 0.01
                      ? "text-[#22C55E]"
                      : "text-[#EAB308]"
                  }
                >
                  {formatCurrency(splitRemaining)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Split toggle (for non-split transactions) */}
        {!isSplit && (
          <button
            onClick={() => {
              setShowSplitEditor(!showSplitEditor);
              if (!showSplitEditor && splitAllocations.length === 0) {
                setSplitAllocations([{ wallet: "", amount: 0 }]);
              }
            }}
            className="flex items-center gap-2 text-xs text-[#A0A0A0] hover:text-[#FAFAFA]"
          >
            <Split className="size-3.5" />
            {showSplitEditor ? "Hide" : "Split"} transaction
          </button>
        )}

        {/* Separator */}
        <div className="border-t border-[#2A2A2A]" />

        {/* Reimbursable toggle */}
        <div>
          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox
              checked={isReimbursable}
              onCheckedChange={(checked) =>
                setIsReimbursable(checked === true)
              }
            />
            <div>
              <p className="text-sm font-medium text-[#FAFAFA]">
                Reimbursable
              </p>
              <p className="text-xs text-[#A0A0A0]">
                This expense will be reimbursed by a project or entity
              </p>
            </div>
          </label>
        </div>

        {/* Request selector */}
        {isReimbursable && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A0A0A0]">
              Linked Reimbursement Request
            </label>
            <Select
              value={selectedRequestId}
              onValueChange={setSelectedRequestId}
            >
              <SelectTrigger className="w-full border-[#2A2A2A] bg-[#0A0A0A] text-[#FAFAFA]">
                <SelectValue placeholder="Select a request (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {reimbursementRequests.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title} ({r.wallet})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </Drawer>
  );
}
