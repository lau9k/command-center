import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setTableData,
  resetAllTables,
  makeTransaction,
  makeReimbursementRequest,
  makeForecastRun,
  makeScheduledFlow,
  resetIdCounter,
} from "../helpers/setup";

async function getTransactionHandlers() {
  return await import("@/app/api/finance/transactions/route");
}

async function getForecastComputeHandler() {
  return await import("@/app/api/finance/forecast/compute/route");
}

async function getFloatCostHandler() {
  return await import("@/app/api/finance/float-cost/route");
}

async function getReimbursementHandlers() {
  return await import("@/app/api/finance/reimbursements/route");
}

// ── Transactions CRUD ───────────────────────────────────────────

describe("GET /api/finance/transactions", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("returns transactions list", async () => {
    const txns = [makeTransaction(), makeTransaction({ description: "Coffee" })];
    setTableData("transactions", txns);

    const { GET } = await getTransactionHandlers();
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
  });

  it("returns 500 on database error", async () => {
    setTableData("transactions", null, { message: "db error" });

    const { GET } = await getTransactionHandlers();
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("db error");
  });
});

describe("POST /api/finance/transactions", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("creates a transaction with valid data", async () => {
    const txn = makeTransaction();
    setTableData("transactions", [txn]);

    const { POST } = await getTransactionHandlers();
    const req = new NextRequest("https://localhost/api/finance/transactions", {
      method: "POST",
      body: JSON.stringify({
        date: "2025-03-01",
        description: "Invoice payment",
        amount: 1500,
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("returns 400 for missing required fields", async () => {
    const { POST } = await getTransactionHandlers();
    const req = new NextRequest("https://localhost/api/finance/transactions", {
      method: "POST",
      body: JSON.stringify({ amount: 100 }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid amount type", async () => {
    const { POST } = await getTransactionHandlers();
    const req = new NextRequest("https://localhost/api/finance/transactions", {
      method: "POST",
      body: JSON.stringify({
        date: "2025-03-01",
        description: "Test",
        amount: "not-number",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/finance/transactions", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("updates a transaction", async () => {
    const txn = makeTransaction({ amount: 200 });
    setTableData("transactions", [txn]);

    const { PATCH } = await getTransactionHandlers();
    const req = new NextRequest("https://localhost/api/finance/transactions", {
      method: "PATCH",
      body: JSON.stringify({
        id: "11111111-1111-4111-a111-111111111111",
        amount: 200,
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
  });

  it("returns 400 for missing id", async () => {
    const { PATCH } = await getTransactionHandlers();
    const req = new NextRequest("https://localhost/api/finance/transactions", {
      method: "PATCH",
      body: JSON.stringify({ amount: 200 }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/finance/transactions", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("deletes a transaction by id", async () => {
    setTableData("transactions", []);

    const { DELETE } = await getTransactionHandlers();
    const req = new NextRequest(
      "https://localhost/api/finance/transactions?id=11111111-1111-4111-a111-111111111111",
      { method: "DELETE" }
    );
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 400 for missing id", async () => {
    const { DELETE } = await getTransactionHandlers();
    const req = new NextRequest(
      "https://localhost/api/finance/transactions",
      { method: "DELETE" }
    );
    const res = await DELETE(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid uuid", async () => {
    const { DELETE } = await getTransactionHandlers();
    const req = new NextRequest(
      "https://localhost/api/finance/transactions?id=not-a-uuid",
      { method: "DELETE" }
    );
    const res = await DELETE(req);

    expect(res.status).toBe(400);
  });
});

// ── Forecast Compute ────────────────────────────────────────────

describe("POST /api/finance/forecast/compute", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("computes forecast for a specific run", async () => {
    const runId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
    const run = makeForecastRun({ id: runId, horizon_days: 30, starting_cash: 10000 });
    const flow = makeScheduledFlow({ cadence: "monthly", due_day: 1, amount: 2000, direction: "inflow" });

    setTableData("scheduled_flows", [flow]);
    setTableData("forecast_runs", [run]);
    setTableData("cash_forecasts", []);

    const { POST } = await getForecastComputeHandler();
    const req = new NextRequest("https://localhost/api/finance/forecast/compute", {
      method: "POST",
      body: JSON.stringify({ runId }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.runId).toBe(runId);
    expect(body.timeSeries).toBeDefined();
    expect(body.timeSeries.length).toBe(30);
    expect(body.runway).toBeDefined();
    expect(typeof body.minBalance).toBe("number");
  });

  it("computes forecast for all runs when no runId", async () => {
    const runs = [
      makeForecastRun({ name: "Optimistic", horizon_days: 10, starting_cash: 5000 }),
      makeForecastRun({ name: "Pessimistic", horizon_days: 10, starting_cash: 1000 }),
    ];
    setTableData("scheduled_flows", []);
    setTableData("forecast_runs", runs);

    const { POST } = await getForecastComputeHandler();
    const req = new NextRequest("https://localhost/api/finance/forecast/compute", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    body.forEach((result: Record<string, unknown>) => {
      expect(result.timeSeries).toBeDefined();
      expect(typeof result.runway).toBe("number");
      expect(typeof result.minBalance).toBe("number");
    });
  });

  it("returns 404 when specific run does not exist", async () => {
    setTableData("scheduled_flows", []);
    const builder = setTableData("forecast_runs", null, {
      message: "Run not found",
    });
    // Override single to return PGRST116-like not-found
    builder.single.mockResolvedValue({
      data: null,
      error: { message: "Run not found", code: "PGRST116" },
    });

    const { POST } = await getForecastComputeHandler();
    const req = new NextRequest("https://localhost/api/finance/forecast/compute", {
      method: "POST",
      body: JSON.stringify({ runId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });
});

// ── Float Cost ──────────────────────────────────────────────────

describe("GET /api/finance/float-cost", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("computes float cost for outstanding reimbursements", async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const requests = [
      makeReimbursementRequest({
        id: "req-1",
        total_amount: 1000,
        status: "submitted",
        created_at: thirtyDaysAgo.toISOString(),
      }),
    ];
    setTableData("reimbursement_requests", requests);
    setTableData("reimbursement_payment_allocations", []);

    const { GET } = await getFloatCostHandler();
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(typeof body.total_outstanding).toBe("number");
    expect(typeof body.total_float_cost).toBe("number");
    expect(typeof body.monthly_float_cost).toBe("number");
    expect(typeof body.ytd_float_cost).toBe("number");
    expect(body.apr).toBe(0.2599);
    expect(body.details).toBeDefined();
    expect(body.total_outstanding).toBe(1000);
    expect(body.total_float_cost).toBeGreaterThan(0);
  });

  it("returns zero float cost when no outstanding requests", async () => {
    setTableData("reimbursement_requests", []);

    const { GET } = await getFloatCostHandler();
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total_outstanding).toBe(0);
    expect(body.total_float_cost).toBe(0);
  });
});

// ── Reimbursements CRUD ─────────────────────────────────────────

describe("GET /api/finance/reimbursements", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("returns reimbursement requests", async () => {
    const requests = [makeReimbursementRequest()];
    setTableData("reimbursement_requests", requests);

    const { GET } = await getReimbursementHandlers();
    const req = new NextRequest("https://localhost/api/finance/reimbursements");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
  });

  it("returns requests with items when withItems=true", async () => {
    const request = makeReimbursementRequest({ id: "req-1" });
    const items = [
      { id: "item-1", reimbursement_request_id: "req-1", description: "Flight", amount: 500 },
    ];
    setTableData("reimbursement_requests", [request]);
    setTableData("reimbursement_items", items);

    const { GET } = await getReimbursementHandlers();
    const req = new NextRequest(
      "https://localhost/api/finance/reimbursements?withItems=true"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body[0].items).toBeDefined();
    expect(body[0].items).toHaveLength(1);
  });
});

describe("POST /api/finance/reimbursements", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("creates a reimbursement request", async () => {
    const request = makeReimbursementRequest();
    setTableData("reimbursement_requests", [request]);

    const { POST } = await getReimbursementHandlers();
    const req = new NextRequest("https://localhost/api/finance/reimbursements", {
      method: "POST",
      body: JSON.stringify({
        title: "Office supplies",
        total_amount: 250,
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("creates a reimbursement with line items", async () => {
    const request = makeReimbursementRequest();
    setTableData("reimbursement_requests", [request]);
    setTableData("reimbursement_items", []);

    const { POST } = await getReimbursementHandlers();
    const req = new NextRequest("https://localhost/api/finance/reimbursements", {
      method: "POST",
      body: JSON.stringify({
        title: "Trip expenses",
        total_amount: 1000,
        items: [
          { description: "Flight", amount: 600 },
          { description: "Hotel", amount: 400 },
        ],
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("returns 400 for missing title", async () => {
    const { POST } = await getReimbursementHandlers();
    const req = new NextRequest("https://localhost/api/finance/reimbursements", {
      method: "POST",
      body: JSON.stringify({ total_amount: 100 }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/finance/reimbursements", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("transitions status from draft to submitted", async () => {
    const updated = makeReimbursementRequest({ status: "submitted" });
    setTableData("reimbursement_requests", [updated]);

    const { PATCH } = await getReimbursementHandlers();
    const req = new NextRequest("https://localhost/api/finance/reimbursements", {
      method: "PATCH",
      body: JSON.stringify({
        id: "11111111-1111-4111-a111-111111111111",
        status: "submitted",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
  });

  it("transitions status from submitted to approved", async () => {
    const updated = makeReimbursementRequest({ status: "approved" });
    setTableData("reimbursement_requests", [updated]);

    const { PATCH } = await getReimbursementHandlers();
    const req = new NextRequest("https://localhost/api/finance/reimbursements", {
      method: "PATCH",
      body: JSON.stringify({
        id: "11111111-1111-4111-a111-111111111111",
        status: "approved",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
  });

  it("transitions status from approved to paid", async () => {
    const updated = makeReimbursementRequest({ status: "paid" });
    setTableData("reimbursement_requests", [updated]);

    const { PATCH } = await getReimbursementHandlers();
    const req = new NextRequest("https://localhost/api/finance/reimbursements", {
      method: "PATCH",
      body: JSON.stringify({
        id: "11111111-1111-4111-a111-111111111111",
        status: "paid",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
  });

  it("returns 400 for missing id", async () => {
    const { PATCH } = await getReimbursementHandlers();
    const req = new NextRequest("https://localhost/api/finance/reimbursements", {
      method: "PATCH",
      body: JSON.stringify({ status: "approved" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/finance/reimbursements", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("deletes a reimbursement request", async () => {
    setTableData("reimbursement_requests", []);

    const { DELETE } = await getReimbursementHandlers();
    const req = new NextRequest(
      "https://localhost/api/finance/reimbursements?id=11111111-1111-4111-a111-111111111111",
      { method: "DELETE" }
    );
    const res = await DELETE(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("returns 400 for missing id", async () => {
    const { DELETE } = await getReimbursementHandlers();
    const req = new NextRequest(
      "https://localhost/api/finance/reimbursements",
      { method: "DELETE" }
    );
    const res = await DELETE(req);

    expect(res.status).toBe(400);
  });
});
