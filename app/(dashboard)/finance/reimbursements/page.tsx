import { createClient } from "@/lib/supabase/server";
import { ReimbursementsDashboard } from "@/components/finance/ReimbursementsDashboard";
import type {
  ReimbursementRequest,
  ReimbursementItem,
  ReimbursementPayment,
  ReimbursementPaymentAllocation,
  Transaction,
} from "@/lib/types/database";

export default async function ReimbursementsPage() {
  const supabase = await createClient();

  const [requestsRes, itemsRes, paymentsRes, allocationsRes, transactionsRes] =
    await Promise.all([
      supabase
        .from("reimbursement_requests")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("reimbursement_items")
        .select("*")
        .order("expense_date", { ascending: true }),
      supabase
        .from("reimbursement_payments")
        .select("*")
        .order("payment_date", { ascending: false }),
      supabase
        .from("reimbursement_payment_allocations")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("*")
        .eq("is_reimbursable", true)
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Reimbursements</h1>
        <p className="mt-1 text-sm text-[#A0A0A0]">
          Track expenses owed by projects, record payments, and monitor float
          cost
        </p>
      </div>

      <ReimbursementsDashboard
        requests={(requestsRes.data as ReimbursementRequest[]) ?? []}
        items={(itemsRes.data as ReimbursementItem[]) ?? []}
        payments={(paymentsRes.data as ReimbursementPayment[]) ?? []}
        allocations={
          (allocationsRes.data as ReimbursementPaymentAllocation[]) ?? []
        }
        reimbursableTransactions={
          (transactionsRes.data as Transaction[]) ?? []
        }
      />
    </div>
  );
}
