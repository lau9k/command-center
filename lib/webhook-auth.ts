import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Validates the webhook shared secret from the x-webhook-secret header.
 * Returns null if valid, or an error NextResponse if invalid.
 */
export function validateWebhookSecret(
  request: NextRequest
): NextResponse | null {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const provided = request.headers.get("x-webhook-secret");
  if (!provided) {
    return NextResponse.json(
      { success: false, error: "Missing x-webhook-secret header" },
      { status: 401 }
    );
  }

  const expected = Buffer.from(secret);
  const received = Buffer.from(provided);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid webhook secret" },
      { status: 401 }
    );
  }

  return null;
}
