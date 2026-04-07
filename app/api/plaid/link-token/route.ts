import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { withAuth } from "@/lib/auth/api-guard";
import { getPlaidClient } from "@/lib/plaid";

export const runtime = "nodejs";

export const POST = withAuth(async function POST(_request, _user) {
  const plaid = getPlaidClient();

  const countryCodes = (process.env.PLAID_COUNTRY_CODES ?? "CA")
    .split(",")
    .map((c) => c.trim() as CountryCode);

  const products = (process.env.PLAID_PRODUCTS ?? "auth,transactions")
    .split(",")
    .map((p) => p.trim() as Products);

  try {
    const { data } = await plaid.linkTokenCreate({
      user: { client_user_id: "command-center-user" },
      client_name: "Command Center",
      products,
      country_codes: countryCodes,
      language: "en",
    });

    return NextResponse.json({ link_token: data.link_token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
