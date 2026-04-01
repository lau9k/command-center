import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setTableData,
  resetAllTables,
  makeContact,
  resetIdCounter,
} from "../helpers/setup";

// Dynamic import to ensure mocks are in place
async function getRouteHandlers() {
  const mod = await import("@/app/api/contacts/route");
  return { GET: mod.GET, POST: mod.POST };
}

describe("GET /api/contacts", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
    // Force Supabase fallback by unsetting personize key
    delete process.env.PERSONIZE_SECRET_KEY;
  });

  it("returns contacts list from Supabase", async () => {
    const contacts = [makeContact(), makeContact({ name: "Jane" })];
    setTableData("contacts", contacts);

    const { GET } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/contacts?source=supabase");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.source).toBe("supabase");
  });

  it("returns 500 on Supabase error", async () => {
    setTableData("contacts", null, { message: "db error" });

    const { GET } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/contacts?source=supabase");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});

describe("POST /api/contacts", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("creates a contact with valid data", async () => {
    const newContact = makeContact();
    setTableData("contacts", [newContact]);

    const { POST } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Test Contact", email: "test@example.com" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe("Test Contact");
  });

  it("returns 400 for missing required name", async () => {
    const { POST } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Invalid/i);
    expect(body.details).toBeDefined();
  });

  it("returns 400 for invalid email format", async () => {
    const { POST } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Test", email: "not-an-email" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
