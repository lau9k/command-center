import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setTableData,
  resetAllTables,
  makeTask,
  resetIdCounter,
} from "../helpers/setup";

async function getRouteHandlers() {
  return await import("@/app/api/tasks/route");
}

async function getRankedHandler() {
  return await import("@/app/api/tasks/ranked/route");
}

async function getIdRouteHandlers() {
  return await import("@/app/api/tasks/[id]/route");
}

async function getBulkHandler() {
  return await import("@/app/api/tasks/bulk/route");
}

describe("GET /api/tasks", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("returns tasks list", async () => {
    const tasks = [makeTask(), makeTask({ title: "Second task" })];
    setTableData("tasks", tasks);

    const { GET } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/tasks");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it("returns 500 on database error", async () => {
    setTableData("tasks", null, { message: "connection failed" });

    const { GET } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/tasks");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("connection failed");
  });
});

describe("POST /api/tasks", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("creates a task with valid data", async () => {
    const task = makeTask();
    setTableData("tasks", [task]);

    const { POST } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "New task" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data).toBeDefined();
  });

  it("returns 400 for missing title", async () => {
    const { POST } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ description: "no title" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid priority value", async () => {
    const { POST } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Task", priority: "mega" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/tasks/[id]", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("updates a task", async () => {
    const id = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
    const updated = makeTask({ id, title: "Updated title", status: "in_progress" });
    setTableData("tasks", [updated]);

    const { PATCH } = await getIdRouteHandlers();
    const req = new NextRequest(`https://localhost/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "in_progress" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toBeDefined();
  });
});

describe("DELETE /api/tasks/[id]", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("removes a task", async () => {
    const id = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
    setTableData("tasks", []);

    const { DELETE } = await getIdRouteHandlers();
    const req = new NextRequest(`https://localhost/api/tasks/${id}`, {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: Promise.resolve({ id }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });
});

describe("GET /api/tasks/ranked", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("returns tasks sorted by score descending", async () => {
    const tasks = [
      makeTask({ title: "Low", priority: "low" }),
      makeTask({ title: "Critical", priority: "critical" }),
    ];
    setTableData("tasks", tasks);

    const { GET } = await getRankedHandler();
    const req = new NextRequest("https://localhost/api/tasks/ranked");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data.length).toBe(2);
    // scoreTask mock gives critical=100, others=50
    expect(body.data[0].score).toBeGreaterThanOrEqual(body.data[1].score);
  });
});

describe("PUT /api/tasks/bulk", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("bulk updates tasks", async () => {
    const id1 = "11111111-1111-4111-a111-111111111111";
    const id2 = "22222222-2222-4222-a222-222222222222";
    const updated = [
      makeTask({ id: id1, status: "done" }),
      makeTask({ id: id2, status: "done" }),
    ];
    setTableData("tasks", updated);

    const { PUT } = await getBulkHandler();
    const req = new NextRequest("https://localhost/api/tasks/bulk", {
      method: "PUT",
      body: JSON.stringify({ ids: [id1, id2], updates: { status: "done" } }),
      headers: { "content-type": "application/json" },
    });
    const res = await PUT(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.updated).toBe(2);
  });

  it("returns 400 for empty ids array", async () => {
    const { PUT } = await getBulkHandler();
    const req = new NextRequest("https://localhost/api/tasks/bulk", {
      method: "PUT",
      body: JSON.stringify({ ids: [], updates: { status: "done" } }),
      headers: { "content-type": "application/json" },
    });
    const res = await PUT(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 when no update fields provided", async () => {
    const { PUT } = await getBulkHandler();
    const req = new NextRequest("https://localhost/api/tasks/bulk", {
      method: "PUT",
      body: JSON.stringify({
        ids: ["11111111-1111-4111-a111-111111111111"],
        updates: {},
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await PUT(req);

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/tasks/bulk", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("deletes tasks by ids", async () => {
    setTableData("tasks", []);

    const { DELETE } = await getBulkHandler();
    const req = new NextRequest("https://localhost/api/tasks/bulk", {
      method: "DELETE",
      body: JSON.stringify({ ids: ["11111111-1111-4111-a111-111111111111"] }),
      headers: { "content-type": "application/json" },
    });
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(1);
  });
});
