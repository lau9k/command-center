import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

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
      { status: 503 }
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

/**
 * Verifies HMAC-SHA256 signature from x-webhook-signature header.
 * The signature is computed as HMAC-SHA256(API_SECRET, rawBody).
 * Returns null if valid, or an error NextResponse if invalid.
 */
export async function validateWebhookSignature(
  request: NextRequest
): Promise<{ error: NextResponse | null; body: string }> {
  const apiSecret = process.env.API_SECRET;
  if (!apiSecret) {
    return {
      error: NextResponse.json(
        { success: false, error: "API_SECRET not configured" },
        { status: 500 }
      ),
      body: "",
    };
  }

  const signature = request.headers.get("x-webhook-signature");
  if (!signature) {
    return {
      error: NextResponse.json(
        { success: false, error: "Missing x-webhook-signature header" },
        { status: 401 }
      ),
      body: "",
    };
  }

  const rawBody = await request.text();

  const expectedSig = createHmac("sha256", apiSecret)
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedSig, "hex");
  const receivedBuf = Buffer.from(signature, "hex");

  if (
    expectedBuf.length !== receivedBuf.length ||
    !timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    return {
      error: NextResponse.json(
        { success: false, error: "Invalid webhook signature" },
        { status: 401 }
      ),
      body: rawBody,
    };
  }

  return { error: null, body: rawBody };
}
