import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const triggerSyncSchema = z.object({
  source: z.enum(["gmail", "plaid", "granola", "n8n", "personize"]),
});

const SYNC_ENDPOINTS: Record<string, string> = {
  gmail: "/api/gmail/sync",
  plaid: "/api/plaid/sync",
  granola: "/api/sync/granola",
};

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = triggerSyncSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { source } = parsed.data;
  const endpoint = SYNC_ENDPOINTS[source];

  if (!endpoint) {
    return NextResponse.json(
      { error: `Sync not yet implemented for ${source}. Configure via n8n or external triggers.` },
      { status: 400 }
    );
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server sync configuration missing" },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;

  const syncRes = await fetch(`${origin}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-key": cronSecret,
    },
    signal: AbortSignal.timeout(60000),
  });

  const result = await syncRes.json();

  return NextResponse.json(
    { success: syncRes.ok, source, ...result },
    { status: syncRes.ok ? 200 : 207 }
  );
});
