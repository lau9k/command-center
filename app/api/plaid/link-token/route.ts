import { NextResponse } from "next/server";
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from "plaid";
import { withAuth } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

export const POST = withAuth(async function POST(_request, _user) {
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
