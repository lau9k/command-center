import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

export const GET = withAuth(async function GET(_request, _user) {
  const supabase = createServiceClient();

  const { data: items, error: itemsError } = await supabase
    .from("plaid_items")
    .select("id, item_id, institution_name, status, updated_at")
    .order("created_at", { ascending: false });

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const { data: accounts, error: accountsError } = await supabase
    .from("plaid_accounts")
    .select("id, plaid_item_id, account_id, name, official_name, type, subtype, mask")
    .order("created_at", { ascending: true });

  if (accountsError) {
    return NextResponse.json({ error: accountsError.message }, { status: 500 });
  }

  // Group accounts under their items
  const result = (items ?? [])
    .filter((item) => item.status === "active")
    .map((item) => ({
      ...item,
      accounts: (accounts ?? []).filter((a) => a.plaid_item_id === item.id),
    }));

  return NextResponse.json({ items: result });
});
