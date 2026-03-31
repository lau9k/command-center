"use server";

import {
  createTransaction,
  updateTransaction,
} from "@/lib/api/finance";
import { createServiceClient } from "@/lib/supabase/service";
import type { Transaction } from "@/lib/types/database";

export async function recordTransaction(
  data: Partial<Transaction>
): Promise<Transaction> {
  return createTransaction(data);
}

export async function updateDebtPayment(
  id: string,
  amount: number
): Promise<void> {
  const supabase = createServiceClient();

  const { data: debt, error: fetchError } = await supabase
    .from("debts")
    .select("balance")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  const newBalance = (debt as { balance: number }).balance - amount;

  const { error: updateError } = await supabase
    .from("debts")
    .update({ balance: newBalance })
    .eq("id", id);

  if (updateError) throw updateError;
}

export async function importTransactions(
  rows: Partial<Transaction>[]
): Promise<Transaction[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("transactions")
    .insert(rows)
    .select("*");

  if (error) throw error;

  return (data ?? []) as Transaction[];
}
