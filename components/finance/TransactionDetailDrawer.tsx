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
import type { Transaction, ReimbursementRequest } from "@/lib/types/database";

interface TransactionDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  reimbursementRequests: ReimbursementRequest[];
  onUpdate?: () => void;
}

export function TransactionDetailDrawer({
  open,
  onClose,
  transaction,
  reimbursementRequests,
  onUpdate,
}: TransactionDetailDrawerProps) {
  const [isReimbursable, setIsReimbursable] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setIsReimbursable((transaction as Transaction & { is_reimbursable?: boolean }).is_reimbursable ?? false);
      setSelectedRequestId(
        (transaction as Transaction & { reimbursement_request_id?: string }).reimbursement_request_id ?? ""
      );
    }
  }, [transaction]);

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
          reimbursement_request_id: isReimbursable && selectedRequestId ? selectedRequestId : null,
        }),
      });
      onUpdate?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }, [transaction, isReimbursable, selectedRequestId, onClose, onUpdate]);

  if (!transaction) return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    }).format(amount);

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
            <p className="text-sm font-medium text-[#FAFAFA]">{transaction.name}</p>
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
              <p className="text-sm font-medium capitalize text-[#FAFAFA]">{transaction.type}</p>
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

        {/* Reimbursable toggle */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={isReimbursable}
              onCheckedChange={(checked) => setIsReimbursable(checked === true)}
            />
            <div>
              <p className="text-sm font-medium text-[#FAFAFA]">Reimbursable</p>
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
            <Select value={selectedRequestId} onValueChange={setSelectedRequestId}>
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
