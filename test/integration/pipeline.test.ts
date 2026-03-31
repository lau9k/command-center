import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  setTableData,
  resetAllTables,
  makePipelineItem,
  makePipelineStage,
  resetIdCounter,
} from "../../__tests__/helpers/setup";

async function getRouteHandlers() {
  return await import("@/app/api/pipeline/route");
}

// ── Pipeline CRUD + Stage Transitions ────────────────────────────

describe("Pipeline integration", () => {
  beforeEach(() => {
    resetAllTables();
    resetIdCounter();
  });

  describe("GET /api/pipeline", () => {
    it("returns deals (pipeline items)", async () => {
      const stage = makePipelineStage();
      const items = [
        makePipelineItem({ title: "Deal Alpha", stage_id: stage.id }),
        makePipelineItem({ title: "Deal Beta", stage_id: stage.id }),
      ];
      setTableData("pipeline_stages", [stage]);
      setTableData("pipeline_items", items);

      const { GET } = await getRouteHandlers();
      const req = new NextRequest("https://localhost/api/pipeline");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.items).toHaveLength(2);
      expect(body.stages).toHaveLength(1);
    });

    it("returns empty arrays when no data exists", async () => {
      setTableData("pipeline_stages", []);
      setTableData("pipeline_items", []);

      const { GET } = await getRouteHandlers();
      const req = new NextRequest("https://localhost/api/pipeline");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.items).toHaveLength(0);
      expect(body.stages).toHaveLength(0);
    });
  });

  describe("POST /api/pipeline", () => {
    it("creates a deal with valid data", async () => {
      const created = makePipelineItem({ title: "New Deal" });
      setTableData("pipeline_items", [created]);

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

    it("creates a deal with optional metadata", async () => {
      const created = makePipelineItem({
        title: "Big Deal",
        metadata: { deal_value: 50000 },
      });
      setTableData("pipeline_items", [created]);

      const { POST } = await getRouteHandlers();
      const req = new NextRequest("https://localhost/api/pipeline", {
        method: "POST",
        body: JSON.stringify({
          title: "Big Deal",
          pipeline_id: "11111111-1111-4111-a111-111111111111",
          stage_id: "22222222-2222-4222-a222-222222222222",
          project_id: "33333333-3333-4333-a333-333333333333",
          metadata: { deal_value: 50000 },
        }),
        headers: { "content-type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(201);
    });

    it("rejects deal with missing required fields", async () => {
      const { POST } = await getRouteHandlers();
      const req = new NextRequest("https://localhost/api/pipeline", {
        method: "POST",
        body: JSON.stringify({ title: "Incomplete" }),
        headers: { "content-type": "application/json" },
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/pipeline — stage transitions", () => {
    it("moves a deal to a new stage via stage_id update", async () => {
      const newStageId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
      const updated = makePipelineItem({ stage_id: newStageId });
      setTableData("pipeline_items", [updated]);

      const { PATCH } = await getRouteHandlers();
      const req = new NextRequest("https://localhost/api/pipeline", {
        method: "PATCH",
        body: JSON.stringify({
          id: "11111111-1111-4111-a111-111111111111",
          stage_id: newStageId,
        }),
        headers: { "content-type": "application/json" },
      });
      const res = await PATCH(req);

      expect(res.status).toBe(200);
    });

    it("updates deal title alongside stage move", async () => {
      const newStageId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
      const updated = makePipelineItem({
        title: "Renamed Deal",
        stage_id: newStageId,
      });
      setTableData("pipeline_items", [updated]);

      const { PATCH } = await getRouteHandlers();
      const req = new NextRequest("https://localhost/api/pipeline", {
        method: "PATCH",
        body: JSON.stringify({
          id: "11111111-1111-4111-a111-111111111111",
          title: "Renamed Deal",
          stage_id: newStageId,
        }),
        headers: { "content-type": "application/json" },
      });
      const res = await PATCH(req);

      expect(res.status).toBe(200);
    });

    it("rejects stage_id that is not a valid uuid", async () => {
      const { PATCH } = await getRouteHandlers();
      const req = new NextRequest("https://localhost/api/pipeline", {
        method: "PATCH",
        body: JSON.stringify({
          id: "11111111-1111-4111-a111-111111111111",
          stage_id: "not-a-valid-uuid",
        }),
        headers: { "content-type": "application/json" },
      });
      const res = await PATCH(req);

      expect(res.status).toBe(400);
    });

    it("rejects update with missing id", async () => {
      const { PATCH } = await getRouteHandlers();
      const req = new NextRequest("https://localhost/api/pipeline", {
        method: "PATCH",
        body: JSON.stringify({
          stage_id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        }),
        headers: { "content-type": "application/json" },
      });
      const res = await PATCH(req);

      expect(res.status).toBe(400);
    });
  });
});
