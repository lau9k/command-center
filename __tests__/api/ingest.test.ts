import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setTableData,
  resetAllTables,
  makeContact,
  makeTask,
  makeTransaction,
  resetIdCounter,
} from "../helpers/setup";

const VALID_HEADERS = {
  "content-type": "application/json",
  "x-webhook-secret": "test-webhook-secret",
};

async function getIngestContacts() {
  return await import("@/app/api/ingest/contacts/route");
}

async function getIngestTasks() {
  return await import("@/app/api/ingest/tasks/route");
}

async function getIngestTransactions() {
  return await import("@/app/api/ingest/transactions/route");
}

async function getIngestConversations() {
  return await import("@/app/api/ingest/conversations/route");
}

// ── Ingest Contacts ─────────────────────────────────────────────

describe("POST /api/ingest/contacts", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
    process.env.WEBHOOK_SECRET = "test-webhook-secret";
  });

  it("ingests a valid contact", async () => {
    const contact = makeContact();
    setTableData("contacts", [contact]);

    const { POST } = await getIngestContacts();
    const req = new NextRequest("https://localhost/api/ingest/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
      headers: VALID_HEADERS,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  it("returns 401 when webhook secret is missing", async () => {
    const { POST } = await getIngestContacts();
    const req = new NextRequest("https://localhost/api/ingest/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid webhook secret", async () => {
    const { POST } = await getIngestContacts();
    const req = new NextRequest("https://localhost/api/ingest/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
      headers: { ...VALID_HEADERS, "x-webhook-secret": "wrong" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid payload (missing email)", async () => {
    const { POST } = await getIngestContacts();
    const req = new NextRequest("https://localhost/api/ingest/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Alice" }),
      headers: VALID_HEADERS,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.details).toBeDefined();
  });

  it("returns 400 for invalid email format", async () => {
    const { POST } = await getIngestContacts();
    const req = new NextRequest("https://localhost/api/ingest/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Alice", email: "not-valid" }),
      headers: VALID_HEADERS,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ── Ingest Tasks ────────────────────────────────────────────────

describe("POST /api/ingest/tasks", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
    process.env.WEBHOOK_SECRET = "test-webhook-secret";
  });

  it("ingests a valid task", async () => {
    const task = makeTask();
    setTableData("tasks", [task]);

    const { POST } = await getIngestTasks();
    const req = new NextRequest("https://localhost/api/ingest/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Fix bug" }),
      headers: VALID_HEADERS,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
  });

  it("returns 400 for missing title", async () => {
    const { POST } = await getIngestTasks();
    const req = new NextRequest("https://localhost/api/ingest/tasks", {
      method: "POST",
      body: JSON.stringify({ description: "no title" }),
      headers: VALID_HEADERS,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 401 without webhook secret", async () => {
    const { POST } = await getIngestTasks();
    const req = new NextRequest("https://localhost/api/ingest/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "task" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});

// ── Ingest Transactions ─────────────────────────────────────────

describe("POST /api/ingest/transactions", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
    process.env.WEBHOOK_SECRET = "test-webhook-secret";
  });

  it("ingests a valid transaction", async () => {
    const txn = makeTransaction();
    setTableData("transactions", [txn]);

    const { POST } = await getIngestTransactions();
    const req = new NextRequest("https://localhost/api/ingest/transactions", {
      method: "POST",
      body: JSON.stringify({
        date: "2025-03-01",
        description: "Payment received",
        amount: 500,
      }),
      headers: VALID_HEADERS,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
  });

  it("returns 400 for missing required fields", async () => {
    const { POST } = await getIngestTransactions();
    const req = new NextRequest("https://localhost/api/ingest/transactions", {
      method: "POST",
      body: JSON.stringify({ amount: 100 }),
      headers: VALID_HEADERS,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid amount type", async () => {
    const { POST } = await getIngestTransactions();
    const req = new NextRequest("https://localhost/api/ingest/transactions", {
      method: "POST",
      body: JSON.stringify({
        date: "2025-03-01",
        description: "Payment",
        amount: "not-a-number",
      }),
      headers: VALID_HEADERS,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

// ── Ingest Conversations ────────────────────────────────────────

describe("POST /api/ingest/conversations", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
    process.env.WEBHOOK_SECRET = "test-webhook-secret";
  });

  it("ingests a valid conversation", async () => {
    const contact = makeContact({ email: "alice@example.com" });
    setTableData("contacts", [contact]);
    setTableData("conversations", [{ id: "conv-1" }]);

    const { POST } = await getIngestConversations();
    const req = new NextRequest("https://localhost/api/ingest/conversations", {
      method: "POST",
      body: JSON.stringify({
        contact_email: "alice@example.com",
        summary: "Discussed project timeline",
      }),
      headers: VALID_HEADERS,
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
  });

  it("returns 400 for missing contact_email", async () => {
    const { POST } = await getIngestConversations();
    const req = new NextRequest("https://localhost/api/ingest/conversations", {
      method: "POST",
      body: JSON.stringify({ summary: "conversation" }),
      headers: VALID_HEADERS,
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 401 without webhook secret", async () => {
    const { POST } = await getIngestConversations();
    const req = new NextRequest("https://localhost/api/ingest/conversations", {
      method: "POST",
      body: JSON.stringify({ contact_email: "a@b.com" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });
});
