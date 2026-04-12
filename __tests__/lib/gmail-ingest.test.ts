import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  headerLookup,
  shouldSkip,
  processGmailBatch,
  type GmailMessage,
} from "@/lib/gmail-ingest";

// ── Mock Personize memorize ─────────────────────────────────────
const mockMemorize = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/personize/actions", () => ({
  memorize: (...args: unknown[]) => mockMemorize(...args),
}));

// ── Mock Supabase service client ────────────────────────────────
const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "log-1" }, error: null }),
  }),
  then: (resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null }),
});

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({ insert: mockInsert }),
  }),
}));

// ---------------------------------------------------------------------------
// headerLookup
// ---------------------------------------------------------------------------

describe("headerLookup", () => {
  it("reads from payload.headers", () => {
    const email: GmailMessage = {
      payload: {
        headers: [
          { name: "From", value: "alice@example.com" },
          { name: "Subject", value: "Hello" },
        ],
      },
    };

    expect(headerLookup(email, "from")).toBe("alice@example.com");
    expect(headerLookup(email, "subject")).toBe("Hello");
  });

  it("reads from top-level capitalized keys when payload.headers is missing", () => {
    const email: GmailMessage = {
      From: "bob@example.com",
      Subject: "Hi there",
    };

    expect(headerLookup(email, "from")).toBe("bob@example.com");
    expect(headerLookup(email, "subject")).toBe("Hi there");
  });

  it("returns empty string when header is not found anywhere", () => {
    const email: GmailMessage = {};

    expect(headerLookup(email, "from")).toBe("");
    expect(headerLookup(email, "subject")).toBe("");
    expect(headerLookup(email, "x-custom")).toBe("");
  });

  it("prefers payload.headers over top-level keys", () => {
    const email: GmailMessage = {
      From: "top-level@example.com",
      payload: {
        headers: [{ name: "From", value: "payload@example.com" }],
      },
    };

    expect(headerLookup(email, "from")).toBe("payload@example.com");
  });

  it("falls back to lowercase top-level key", () => {
    const email: GmailMessage = {
      from: "lowercase@example.com",
    } as unknown as GmailMessage;

    expect(headerLookup(email, "From")).toBe("lowercase@example.com");
  });
});

// ---------------------------------------------------------------------------
// shouldSkip
// ---------------------------------------------------------------------------

describe("shouldSkip", () => {
  it("skips noreply senders", () => {
    expect(shouldSkip("noreply@company.com", "Your receipt")).toBe(true);
    expect(shouldSkip("no-reply@service.io", "Password reset")).toBe(true);
  });

  it("skips notification senders", () => {
    expect(shouldSkip("notifications@github.com", "New PR")).toBe(true);
  });

  it("skips transactional subdomains", () => {
    expect(shouldSkip("info@notify.stripe.com", "Payment received")).toBe(true);
    expect(shouldSkip("hello@updates.linkedin.com", "New connection")).toBe(true);
  });

  it("skips auto-reply subjects", () => {
    expect(shouldSkip("person@company.com", "Automatic Reply: OOO")).toBe(true);
    expect(shouldSkip("person@company.com", "Out of Office: vacation")).toBe(true);
  });

  it("does not skip regular emails", () => {
    expect(shouldSkip("alice@company.com", "Meeting tomorrow")).toBe(false);
    expect(shouldSkip("bob@startup.io", "Re: Q2 planning")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// processGmailBatch
// ---------------------------------------------------------------------------

describe("processGmailBatch", () => {
  beforeEach(() => {
    mockMemorize.mockClear();
    mockInsert.mockClear();
  });

  it("processes valid emails and skips automated ones", async () => {
    const emails: GmailMessage[] = [
      // Valid email 1
      {
        payload: {
          headers: [
            { name: "From", value: "Alice Smith <alice@company.com>" },
            { name: "To", value: "me@example.com" },
            { name: "Subject", value: "Partnership opportunity" },
            { name: "Date", value: "2026-04-10T10:00:00Z" },
          ],
          mimeType: "text/plain",
          body: {
            data: Buffer.from("Let's discuss the partnership.").toString(
              "base64"
            ),
          },
        },
      },
      // Valid email 2
      {
        payload: {
          headers: [
            { name: "From", value: "bob@startup.io" },
            { name: "Subject", value: "Follow up" },
          ],
          mimeType: "text/plain",
          body: { data: Buffer.from("Following up on our call.").toString("base64") },
        },
      },
      // Automated email — should be skipped
      {
        payload: {
          headers: [
            { name: "From", value: "noreply@notifications.github.com" },
            { name: "Subject", value: "New issue opened" },
          ],
        },
      },
    ];

    const result = await processGmailBatch(emails);

    expect(result.processed).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(0);

    // Verify memorize was called for each processed email
    expect(mockMemorize).toHaveBeenCalledTimes(2);

    // Check first call — sender email passed
    expect(mockMemorize).toHaveBeenCalledWith(
      expect.stringContaining("alice@company.com"),
      ["email", "gmail", "conversation"],
      "alice@company.com"
    );

    // Check second call
    expect(mockMemorize).toHaveBeenCalledWith(
      expect.stringContaining("bob@startup.io"),
      ["email", "gmail", "conversation"],
      "bob@startup.io"
    );
  });

  it("skips emails with no From header", async () => {
    const emails: GmailMessage[] = [
      { payload: { headers: [{ name: "Subject", value: "No sender" }] } },
    ];

    const result = await processGmailBatch(emails);

    expect(result.processed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockMemorize).not.toHaveBeenCalled();
  });

  it("continues batch on individual email error", async () => {
    mockMemorize
      .mockRejectedValueOnce(new Error("API timeout"))
      .mockResolvedValueOnce(true);

    const emails: GmailMessage[] = [
      {
        payload: {
          headers: [
            { name: "From", value: "failing@example.com" },
            { name: "Subject", value: "Will fail" },
          ],
        },
      },
      {
        payload: {
          headers: [
            { name: "From", value: "success@example.com" },
            { name: "Subject", value: "Will succeed" },
          ],
        },
      },
    ];

    const result = await processGmailBatch(emails);

    expect(result.processed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("API timeout");
  });

  it("handles empty batch", async () => {
    const result = await processGmailBatch([]);

    expect(result.processed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});
