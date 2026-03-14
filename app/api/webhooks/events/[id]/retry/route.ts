import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { retryWebhookEvent } from "@/lib/webhook-events";

export const POST = withErrorHandler(async function POST(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const params = await context!.params;
  const id = params.id;

  if (!id) {
    return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
  }

  try {
    const updated = await retryWebhookEvent(id);
    return NextResponse.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retry failed";
    if (message === "Webhook event not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
