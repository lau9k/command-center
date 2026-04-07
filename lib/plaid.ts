import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

export function getPlaidClient(): PlaidApi {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV ?? "sandbox";

  if (!clientId || !secret) {
    throw new Error("Missing PLAID_CLIENT_ID or PLAID_SECRET");
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

  return new PlaidApi(configuration);
}
