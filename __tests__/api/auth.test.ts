import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { validateWebhookSecret } from "@/lib/webhook-auth";

function makeNextRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://localhost/api/ingest/contacts", {
    method: "POST",
    headers,
  });
}

describe("validateWebhookSecret", () => {
  beforeEach(() => {
    process.env.WEBHOOK_SECRET = "test-webhook-secret";
  });

  it("returns null (pass) for valid webhook secret", () => {
    const req = makeNextRequest({ "x-webhook-secret": "test-webhook-secret" });
    const result = validateWebhookSecret(req);
    expect(result).toBeNull();
  });

  it("returns 401 when x-webhook-secret header is missing", async () => {
    const req = makeNextRequest();
    const result = validateWebhookSecret(req);
    expect(result).not.toBeNull();
    const body = await result!.json();
    expect(result!.status).toBe(401);
    expect(body.error).toMatch(/Missing/i);
  });

  it("returns 401 for invalid webhook secret", async () => {
    const req = makeNextRequest({ "x-webhook-secret": "wrong-secret" });
    const result = validateWebhookSecret(req);
    expect(result).not.toBeNull();
    const body = await result!.json();
    expect(result!.status).toBe(401);
    expect(body.error).toMatch(/Invalid/i);
  });

  it("returns 503 when WEBHOOK_SECRET env var is not configured", async () => {
    delete process.env.WEBHOOK_SECRET;
    const req = makeNextRequest({ "x-webhook-secret": "anything" });
    const result = validateWebhookSecret(req);
    expect(result).not.toBeNull();
    const body = await result!.json();
    expect(result!.status).toBe(503);
    expect(body.error).toMatch(/not configured/i);
  });
});
