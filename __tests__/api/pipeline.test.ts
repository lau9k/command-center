import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setTableData,
  resetAllTables,
  makePipelineItem,
  makePipelineStage,
  resetIdCounter,
} from "../helpers/setup";

async function getRouteHandlers() {
  return await import("@/app/api/pipeline/route");
}

async function getAnalyticsHandler() {
  return await import("@/app/api/pipeline/analytics/route");
}

describe("GET /api/pipeline", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("returns stages and items", async () => {
    const stages = [makePipelineStage()];
    const items = [makePipelineItem()];
    setTableData("pipeline_stages", stages);
    setTableData("pipeline_items", items);

    const { GET } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/pipeline");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stages).toBeDefined();
    expect(body.items).toBeDefined();
  });
});

describe("POST /api/pipeline", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("creates a pipeline item with valid data", async () => {
    const item = makePipelineItem();
    setTableData("pipeline_items", [item]);

    const { POST } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/pipeline", {
      method: "POST",
      body: JSON.stringify({
        title: "New Deal",
        pipeline_id: "11111111-1111-4111-a111-111111111111",
        stage_id: "22222222-2222-4222-a222-222222222222",
        project_id: "33333333-3333-4333-a333-333333333333",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
  });

  it("returns 400 for missing required fields", async () => {
    const { POST } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/pipeline", {
      method: "POST",
      body: JSON.stringify({ title: "Deal" }),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/pipeline", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("updates a pipeline item stage", async () => {
    const updated = makePipelineItem({ stage_id: "new-stage-id" });
    setTableData("pipeline_items", [updated]);

    const { PATCH } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/pipeline", {
      method: "PATCH",
      body: JSON.stringify({
        id: "11111111-1111-4111-a111-111111111111",
        stage_id: "22222222-2222-4222-a222-222222222222",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(200);
  });

  it("returns 400 for missing id", async () => {
    const { PATCH } = await getRouteHandlers();
    const req = new NextRequest("https://localhost/api/pipeline", {
      method: "PATCH",
      body: JSON.stringify({ title: "No ID" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);

    expect(res.status).toBe(400);
  });
});

describe("GET /api/pipeline/analytics", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  it("returns conversion funnel and win/loss stats", async () => {
    const wonStage = makePipelineStage({ slug: "won", name: "Won", sort_order: 2 });
    const leadStage = makePipelineStage({ slug: "lead", name: "Lead", sort_order: 0 });
    const stages = [leadStage, wonStage];

    const items = [
      makePipelineItem({ stage_id: leadStage.id, metadata: { deal_value: 1000 } }),
      makePipelineItem({ stage_id: wonStage.id, metadata: { deal_value: 5000 } }),
    ];

    setTableData("pipeline_stages", stages);
    setTableData("pipeline_items", items);

    const { GET } = await getAnalyticsHandler();
    const req = new NextRequest("https://localhost/api/pipeline/analytics");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.funnel).toBeDefined();
    expect(body.win_loss).toBeDefined();
    expect(body.stage_durations).toBeDefined();
    expect(body.total_deals).toBe(2);
    expect(body.total_value).toBe(6000);
  });
});
