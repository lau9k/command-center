import { NextRequest, NextResponse } from "next/server";
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
} from "plaid";
import { createServiceClient } from "@/lib/supabase/service";
import { encrypt } from "@/lib/plaid-crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV ?? "sandbox";

  if (!clientId || !secret) {
    return NextResponse.json(
      { error: "Missing PLAID_CLIENT_ID or PLAID_SECRET" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { public_token, institution_name } = body as {
    public_token?: string;
    institution_name?: string;
  };

  if (!public_token) {
    return NextResponse.json(
      { error: "public_token is required" },
      { status: 400 }
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

  try {
    const { data } = await plaid.itemPublicTokenExchange({ public_token });

    const encryptedToken = encrypt(data.access_token);

    const supabase = createServiceClient();
    const { error } = await supabase.from("plaid_items").insert({
      item_id: data.item_id,
      access_token_encrypted: encryptedToken,
      institution_name: institution_name ?? null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { item_id: data.item_id, institution_name },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
