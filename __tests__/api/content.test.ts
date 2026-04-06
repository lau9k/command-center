import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setTableData,
  resetAllTables,
  makeContentPost,
  resetIdCounter,
} from "../helpers/setup";

async function getContentHandlers() {
  return await import("@/app/api/content/route");
}

async function getCalendarHandler() {
  return await import("@/app/api/content/calendar/route");
}

describe("GET /api/content", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("returns content posts list", async () => {
    const posts = [makeContentPost(), makeContentPost({ title: "Post 2" })];
    setTableData("content_posts", posts);

    const { GET } = await getContentHandlers();
    const req = new NextRequest("https://localhost/api/content");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("returns 500 on database error", async () => {
    setTableData("content_posts", null, { message: "query failed" });

    const { GET } = await getContentHandlers();
    const req = new NextRequest("https://localhost/api/content");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("query failed");
  });
});

describe("GET /api/content/calendar", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("returns posts within date range", async () => {
    const posts = [makeContentPost({ scheduled_for: "2025-03-10T10:00:00Z" })];
    setTableData("content_posts", posts);

    const { GET } = await getCalendarHandler();
    const req = new NextRequest(
      "https://localhost/api/content/calendar?start=2025-03-01&end=2025-03-31"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 400 when start or end params are missing", async () => {
    const { GET } = await getCalendarHandler();
    const req = new NextRequest("https://localhost/api/content/calendar");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/start and end/i);
  });

  it("returns 400 when only start is provided", async () => {
    const { GET } = await getCalendarHandler();
    const req = new NextRequest(
      "https://localhost/api/content/calendar?start=2025-03-01"
    );
    const res = await GET(req);

    expect(res.status).toBe(400);
  });
});
