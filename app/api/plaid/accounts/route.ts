import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

export type PlaidConnectionStatus =
  | "not_configured"
  | "configured_not_linked"
  | "connected";

export const GET = withAuth(async function GET(_request, _user) {
  const plaidConfigured = !!(
    process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET
  );

  if (!plaidConfigured) {
    return NextResponse.json({
      status: "not_configured" as PlaidConnectionStatus,
      items: [],
    });
  }

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

  const activeItems = (items ?? []).filter((item) => item.status === "active");

  const result = activeItems.map((item) => ({
    ...item,
    accounts: (accounts ?? []).filter((a) => a.plaid_item_id === item.id),
  }));

  const status: PlaidConnectionStatus =
    result.length > 0 ? "connected" : "configured_not_linked";

  return NextResponse.json({ status, items: result });
});
