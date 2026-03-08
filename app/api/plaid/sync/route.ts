import { NextRequest, NextResponse } from "next/server";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  RemovedTransaction,
  TransactionsSyncResponse,
} from "plaid";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt } from "@/lib/plaid-crypto";

export const runtime = "nodejs";

async function syncTransactions(request: NextRequest, requireCronKey = true) {
  if (requireCronKey) {
    const cronKey = process.env.CRON_KEY;
    const headerKey = request.headers.get("x-cron-key");

    if (!cronKey || headerKey !== cronKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV ?? "sandbox";

  if (!clientId || !secret) {
    return NextResponse.json(
      { error: "Missing PLAID_CLIENT_ID or PLAID_SECRET" },
      { status: 500 }
    );
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  const plaid = new PlaidApi(configuration);
  const supabase = createServiceClient();

  const { data: items, error: itemsError } = await supabase
    .from("plaid_items")
    .select("*");

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const results: { item_id: string; added: number; modified: number; removed: number }[] = [];

  for (const item of items ?? []) {
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
          console.error(`Upsert error for item ${item.item_id}:`, upsertError.message);
        }
      }

      // Delete removed transactions
      if (allRemoved.length > 0) {
        const removedIds = allRemoved
          .map((r) => r.transaction_id)
          .filter((id): id is string => !!id);

        if (removedIds.length > 0) {
          const { error: deleteError } = await supabase
            .from("bank_transactions")
            .delete()
            .in("plaid_transaction_id", removedIds);

          if (deleteError) {
            console.error(`Delete error for item ${item.item_id}:`, deleteError.message);
          }
        }
      }

      // Update cursor
      const { error: cursorError } = await supabase
        .from("plaid_items")
        .update({ plaid_cursor: cursor })
        .eq("id", item.id);

      if (cursorError) {
        console.error(`Cursor update error for item ${item.item_id}:`, cursorError.message);
      }

      results.push({
        item_id: item.item_id,
        added: allAdded.length,
        modified: allModified.length,
        removed: allRemoved.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`Sync error for item ${item.item_id}:`, message);
      results.push({
        item_id: item.item_id,
        added: 0,
        modified: 0,
        removed: 0,
      });
    }
  }

  return NextResponse.json({ synced: results });
}

export async function GET(request: NextRequest) {
  return syncTransactions(request, true);
}

export async function POST(request: NextRequest) {
  // POST from frontend doesn't require cron key
  return syncTransactions(request, false);
}
