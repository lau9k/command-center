import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { encrypt } from "@/lib/plaid-crypto";
import { plaidExchangeSchema } from "@/lib/validations";
import { withAuth } from "@/lib/auth/api-guard";
import { getPlaidClient } from "@/lib/plaid";

export const runtime = "nodejs";

export const POST = withAuth(async function POST(request: NextRequest, _user) {
  const body = await request.json();
  const parsed = plaidExchangeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { public_token, institution_name } = parsed.data;

  const plaid = getPlaidClient();

  try {
    const { data } = await plaid.itemPublicTokenExchange({ public_token });

    const encryptedToken = encrypt(data.access_token);

    const supabase = createServiceClient();
    const { data: insertedItem, error } = await supabase
      .from("plaid_items")
      .insert({
        item_id: data.item_id,
        access_token_encrypted: encryptedToken,
        institution_name: institution_name ?? null,
        user_id: "command-center-user",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch accounts from Plaid and store them
    try {
      const accountsRes = await plaid.accountsGet({
        access_token: data.access_token,
      });

      const accountRows = accountsRes.data.accounts.map((acct) => ({
        plaid_item_id: insertedItem.id,
        account_id: acct.account_id,
        name: acct.name,
        official_name: acct.official_name ?? null,
        type: acct.type,
        subtype: acct.subtype ?? null,
        mask: acct.mask ?? null,
        user_id: "command-center-user",
      }));

      if (accountRows.length > 0) {
        await supabase
          .from("plaid_accounts")
          .upsert(accountRows, { onConflict: "account_id" });
      }
    } catch (acctErr) {
      // Non-fatal: accounts can be fetched later during sync
      console.error("Failed to fetch accounts after exchange:", acctErr);
    }

    return NextResponse.json(
      { item_id: data.item_id, institution_name },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
