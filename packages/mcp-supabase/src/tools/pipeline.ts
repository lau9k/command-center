import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupabaseClient } from "../lib/supabase.js";
import { formatError, SupabaseError } from "../lib/errors.js";

export function registerPipelineTools(server: McpServer) {
  server.tool(
    "query_pipeline_items",
    "Search and filter pipeline deals/items. Returns items with their stage information.",
    {
      pipeline_id: z.string().uuid().optional().describe("Filter by pipeline ID"),
      stage_id: z.string().uuid().optional().describe("Filter by stage ID"),
      entity_type: z.string().optional().describe("Filter by entity type (e.g. contact, deal)"),
      search: z.string().optional().describe("Search by title (case-insensitive)"),
      limit: z.number().min(1).max(100).default(50).describe("Max results to return"),
      offset: z.number().min(0).default(0).describe("Offset for pagination"),
    },
    async (params) => {
      const supabase = getSupabaseClient();

      let query = supabase
        .from("pipeline_items")
        .select(
          "id, pipeline_id, stage_id, project_id, title, entity_type, metadata, sort_order, created_at, updated_at, pipeline_stages(id, name, slug, color)",
          { count: "exact" }
        )
        .order("sort_order", { ascending: true })
        .range(params.offset, params.offset + params.limit - 1);

      if (params.pipeline_id) {
        query = query.eq("pipeline_id", params.pipeline_id);
      }

      if (params.stage_id) {
        query = query.eq("stage_id", params.stage_id);
      }

      if (params.entity_type) {
        query = query.eq("entity_type", params.entity_type);
      }

      if (params.search) {
        query = query.ilike("title", `%${params.search}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error as SupabaseError) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ data, count, limit: params.limit, offset: params.offset }, null, 2),
        }],
      };
    }
  );
}
