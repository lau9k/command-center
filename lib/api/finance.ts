import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import type {
  Transaction,
  Debt,
  BalanceSnapshot,
} from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface GetTransactionsFilters {
  type?: string;
  date_from?: string;
  date_to?: string;
}

// ---------------------------------------------------------------------------
// Read operations
// ---------------------------------------------------------------------------

export async function getTransactions(
  filters?: GetTransactionsFilters
): Promise<Transaction[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.date_from) {
    query = query.gte("start_date", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("start_date", filters.date_to);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as Transaction[];
}

export async function getDebts(): Promise<Debt[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Debt[];
}

export async function getBalanceSnapshots(
  limit?: number
): Promise<BalanceSnapshot[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("balance_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as BalanceSnapshot[];
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

export async function createTransaction(
  data: Partial<Transaction>
): Promise<Transaction> {
  const supabase = createServiceClient();

  const { data: created, error } = await supabase
    .from("transactions")
    .insert(data)
    .select("*")
    .single();

  if (error) throw error;

  return created as Transaction;
}

export async function updateTransaction(
  id: string,
  updates: Partial<Transaction>
): Promise<Transaction> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return data as Transaction;
}
