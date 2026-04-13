import "server-only";
import {
  RemovedTransaction,
  TransactionsSyncResponse,
} from "plaid";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/plaid-crypto";
import { getPlaidClient } from "@/lib/plaid";

interface SyncResult {
  item_id: string;
  added: number;
  modified: number;
  removed: number;
  error?: string;
}

interface SyncSummary {
  success: boolean;
  synced: number;
  errors: number;
  results: SyncResult[];
}

export async function getLastSyncDate(): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sync_log")
    .select("completed_at")
    .eq("source", "plaid")
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  return data?.completed_at ?? null;
}

export async function logSync(
  source: string,
  status: "success" | "error" | "partial" | "running" | "warning",
  recordCount: number,
  error?: string,
  options?: { records_found?: number; records_skipped?: number }
): Promise<string | null> {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const row: Record<string, unknown> = {
    source,
    status,
    record_count: recordCount,
    records_synced: recordCount,
    records_found: options?.records_found ?? recordCount,
    records_skipped: options?.records_skipped ?? 0,
    started_at: now,
    ...(status !== "running" ? { completed_at: now } : {}),
    ...(error ? { error_message: error, message: error } : {}),
  };

  const { data, error: insertError } = await supabase
    .from("sync_log")
    .insert(row)
    .select("id")
    .single();

  if (insertError) {
    console.error(`[logSync] Failed to insert sync_log row for ${source}:`, insertError.message);
    return null;
  }

  return data?.id ?? null;
}

async function updateSyncLog(
  id: string,
  status: "success" | "error" | "partial",
  recordCount: number,
  error?: string,
  options?: { records_found?: number; records_skipped?: number }
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("sync_log")
    .update({
      status,
      record_count: recordCount,
      records_synced: recordCount,
      records_found: options?.records_found ?? recordCount,
      records_skipped: options?.records_skipped ?? 0,
      completed_at: new Date().toISOString(),
      ...(error ? { error_message: error, message: error } : {}),
    })
    .eq("id", id);
}

export async function syncTransactions(): Promise<SyncSummary> {
  const supabase = createServiceClient();
  const plaid = getPlaidClient();

  // Log sync start
  const logId = await logSync("plaid", "running", 0);

  const { data: items, error: itemsError } = await supabase
    .from("plaid_items")
    .select("*")
    .eq("status", "active");

  if (itemsError) {
    if (logId) {
      await updateSyncLog(logId, "error", 0, itemsError.message, { records_found: 0, records_skipped: 0 });
    }
    return { success: false, synced: 0, errors: 1, results: [] };
  }

  if (!items || items.length === 0) {
    if (logId) {
      await updateSyncLog(logId, "success", 0, undefined, { records_found: 0, records_skipped: 0 });
    }
    return { success: true, synced: 0, errors: 0, results: [] };
  }

  const results: SyncResult[] = [];
  let totalSynced = 0;
  let totalErrors = 0;

  for (const item of items) {
    try {
      const accessToken = decrypt(item.access_token_encrypted);
      let cursor: string | undefined = item.plaid_cursor ?? undefined;
      let hasMore = true;

      let allAdded: TransactionsSyncResponse["added"] = [];
      let allModified: TransactionsSyncResponse["modified"] = [];
      let allRemoved: RemovedTransaction[] = [];

      while (hasMore) {
        const { data } = await plaid.transactionsSync({
          access_token: accessToken,
          cursor,
        });

        allAdded = allAdded.concat(data.added);
        allModified = allModified.concat(data.modified);
        allRemoved = allRemoved.concat(data.removed);

        hasMore = data.has_more;
        cursor = data.next_cursor;
      }

      // Upsert added + modified transactions
      const toUpsert = [...allAdded, ...allModified].map((txn) => ({
        plaid_transaction_id: txn.transaction_id,
        plaid_item_id: item.id,
        account_id: txn.account_id,
        amount: txn.amount,
        iso_currency_code: txn.iso_currency_code ?? null,
        date: txn.date,
        name: txn.name,
        merchant_name: txn.merchant_name ?? null,
        category: txn.personal_finance_category?.primary ?? null,
        subcategory: txn.personal_finance_category?.detailed ?? null,
        pending: txn.pending,
      }));

      if (toUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from("bank_transactions")
          .upsert(toUpsert, { onConflict: "plaid_transaction_id" });

        if (upsertError) {
          totalErrors++;
          results.push({
            item_id: item.item_id,
            added: 0,
            modified: 0,
            removed: 0,
            error: upsertError.message,
          });
          continue;
        }
      }

      // Delete removed transactions
      if (allRemoved.length > 0) {
        const removedIds = allRemoved
          .map((r) => r.transaction_id)
          .filter((id): id is string => !!id);

        if (removedIds.length > 0) {
          await supabase
            .from("bank_transactions")
            .delete()
            .in("plaid_transaction_id", removedIds);
        }
      }

      // Update cursor
      await supabase
        .from("plaid_items")
        .update({ plaid_cursor: cursor })
        .eq("id", item.id);

      const itemSynced = allAdded.length + allModified.length;
      totalSynced += itemSynced;

      results.push({
        item_id: item.item_id,
        added: allAdded.length,
        modified: allModified.length,
        removed: allRemoved.length,
      });
    } catch (err) {
      totalErrors++;
      const message = err instanceof Error ? err.message : "Unknown error";
      results.push({
        item_id: item.item_id,
        added: 0,
        modified: 0,
        removed: 0,
        error: message,
      });
    }
  }

  // Update sync log with final status
  if (logId) {
    const status = totalErrors > 0
      ? (totalSynced > 0 ? "partial" : "error")
      : "success";
    const errorMsg = totalErrors > 0
      ? `${totalErrors} item(s) failed to sync`
      : undefined;
    await updateSyncLog(logId, status, totalSynced, errorMsg, { records_found: totalSynced, records_skipped: 0 });
  }

  return {
    success: totalErrors === 0,
    synced: totalSynced,
    errors: totalErrors,
    results,
  };
}
