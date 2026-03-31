import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setTableData,
  resetAllTables,
  makeTransaction,
  makeReimbursementRequest,
  resetIdCounter,
} from "../../__tests__/helpers/setup";

async function getTransactionHandlers() {
  return await import("@/app/api/finance/transactions/route");
}

async function getFloatCostHandler() {
  return await import("@/app/api/finance/float-cost/route");
}

// ── Finance Transactions + Debt Calculation ──────────────────────

describe("Finance integration", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  describe("GET /api/finance/transactions", () => {
    it("returns a list of transactions", async () => {
      const txns = [
        makeTransaction({ description: "Revenue" }),
        makeTransaction({ description: "Expense", amount: -50 }),
        makeTransaction({ description: "Refund", amount: 25 }),
      ];
      setTableData("transactions", txns);

      const { GET } = await getTransactionHandlers();
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(3);
    });

    it("returns empty list when no transactions exist", async () => {
      setTableData("transactions", []);

      const { GET } = await getTransactionHandlers();
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveLength(0);
    });

    it("returns 500 on database error", async () => {
      setTableData("transactions", null, { message: "connection refused" });

      const { GET } = await getTransactionHandlers();
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe("connection refused");
    });
  });

  describe("POST /api/finance/transactions", () => {
    it("creates a transaction with valid data", async () => {
      const txn = makeTransaction();
      setTableData("transactions", [txn]);

      const { POST } = await getTransactionHandlers();
      const req = new NextRequest("https://localhost/api/finance/transactions", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-06-01",
          description: "Client payment",
          amount: 3000,
        }),
        headers: { "content-type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
    });

    it("creates a transaction with all optional fields", async () => {
      const txn = makeTransaction();
      setTableData("transactions", [txn]);

      const { POST } = await getTransactionHandlers();
      const req = new NextRequest("https://localhost/api/finance/transactions", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-06-01",
          description: "Subscription fee",
          amount: -99.99,
          currency: "USD",
          category: "software",
          wallet: "business",
          type: "expense",
          notes: "Annual plan",
        }),
        headers: { "content-type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
    });

    it("rejects transaction missing required fields", async () => {
      const { POST } = await getTransactionHandlers();
      const req = new NextRequest("https://localhost/api/finance/transactions", {
        method: "POST",
        body: JSON.stringify({ amount: 100 }),
        headers: { "content-type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("rejects transaction with invalid amount type", async () => {
      const { POST } = await getTransactionHandlers();
      const req = new NextRequest("https://localhost/api/finance/transactions", {
        method: "POST",
        body: JSON.stringify({
          date: "2025-06-01",
          description: "Bad amount",
          amount: "not-a-number",
        }),
        headers: { "content-type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe("Debt calculation — GET /api/finance/float-cost", () => {
    it("returns correct totals for outstanding reimbursements", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const requests = [
        makeReimbursementRequest({
          id: "req-1",
          total_amount: 2000,
          status: "submitted",
          created_at: thirtyDaysAgo.toISOString(),
        }),
        makeReimbursementRequest({
          id: "req-2",
          total_amount: 500,
          status: "approved",
          created_at: thirtyDaysAgo.toISOString(),
        }),
      ];
      setTableData("reimbursement_requests", requests);
      setTableData("reimbursement_payment_allocations", []);

      const { GET } = await getFloatCostHandler();
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.total_outstanding).toBe(2500);
      expect(body.total_float_cost).toBeGreaterThan(0);
      expect(body.monthly_float_cost).toBeGreaterThan(0);
      expect(body.apr).toBe(0.2599);
      expect(body.details).toHaveLength(2);
    });

    it("returns zero when no outstanding debt exists", async () => {
      setTableData("reimbursement_requests", []);

      const { GET } = await getFloatCostHandler();
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.total_outstanding).toBe(0);
      expect(body.total_float_cost).toBe(0);
      expect(body.monthly_float_cost).toBe(0);
    });

    it("accounts for partial payments via allocations", async () => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const requests = [
        makeReimbursementRequest({
          id: "req-1",
          total_amount: 1000,
          status: "submitted",
          created_at: sixtyDaysAgo.toISOString(),
        }),
      ];
      const allocations = [
        { reimbursement_request_id: "req-1", amount: 400 },
      ];
      setTableData("reimbursement_requests", requests);
      setTableData("reimbursement_payment_allocations", allocations);

      const { GET } = await getFloatCostHandler();
      const res = await GET();
      const body = await res.json();

      expect(res.status).toBe(200);
      // Outstanding = 1000 - 400 = 600
      expect(body.total_outstanding).toBe(600);
      expect(body.total_float_cost).toBeGreaterThan(0);
      expect(body.details[0].outstanding).toBe(600);
      expect(body.details[0].days_open).toBeGreaterThanOrEqual(59);
      expect(body.details[0].days_open).toBeLessThanOrEqual(60);
    });
  });
});
