import "server-only";
import { createClient } from "@supabase/supabase-js";

function buildServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const missing = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !key && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    throw new Error(
      `Supabase service client misconfigured — missing env vars: ${missing.join(", ")}`
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

let serviceClient: ReturnType<typeof buildServiceClient> | null = null;

export function createServiceClient() {
  if (!serviceClient) {
    serviceClient = buildServiceClient();
  }
  return serviceClient;
}
