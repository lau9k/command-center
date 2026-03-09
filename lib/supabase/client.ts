import { createBrowserClient } from "@supabase/ssr";

function buildClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

let client: ReturnType<typeof buildClient> | null = null;

export function createClient() {
  if (!client) {
    client = buildClient();
  }
  return client;
}
