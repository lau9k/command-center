import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupabaseClient } from "../lib/supabase.js";
import { formatError, SupabaseError } from "../lib/errors.js";

export function registerContentTools(server: McpServer) {
  server.tool(
    "query_content_posts",
    "Search and filter content posts. Supports filtering by status, platform, type, and search term.",
    {
      search: z.string().optional().describe("Search by title or caption (case-insensitive)"),
      status: z.enum(["draft", "ready", "scheduled", "published", "failed"]).optional().describe("Filter by post status"),
      platform: z.string().optional().describe("Filter by platform (twitter, instagram, tiktok, telegram, linkedin, youtube)"),
      type: z.string().optional().describe("Filter by content type"),
      project_id: z.string().uuid().optional().describe("Filter by project ID"),
      limit: z.number().min(1).max(100).default(50).describe("Max results to return"),
      offset: z.number().min(0).default(0).describe("Offset for pagination"),
    },
    async (params) => {
      const supabase = getSupabaseClient();

      let query = supabase
        .from("content_posts")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(params.offset, params.offset + params.limit - 1);

      if (params.search) {
        query = query.or(
          `title.ilike.%${params.search}%,caption.ilike.%${params.search}%`
        );
      }

      if (params.status) {
        query = query.eq("status", params.status);
      }

      if (params.platform) {
        query = query.contains("platforms", JSON.stringify([params.platform]));
      }

      if (params.type) {
        query = query.eq("type", params.type);
      }

      if (params.project_id) {
        query = query.eq("project_id", params.project_id);
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

  server.tool(
    "create_content_post",
    "Insert a new content post. Supports Buffer-style fields for multi-platform publishing.",
    {
      title: z.string().optional().describe("Post title"),
      body: z.string().optional().describe("Post body/content"),
      caption: z.string().optional().describe("Post caption (Buffer-style)"),
      image_url: z.string().url().optional().describe("Primary image URL"),
      platforms: z.array(z.string()).optional().describe("Target platforms (twitter, instagram, tiktok, telegram, linkedin, youtube)"),
      type: z.string().default("post").describe("Content type (default: post)"),
      status: z.enum(["draft", "ready", "scheduled", "published", "failed"]).default("draft").describe("Post status"),
      scheduled_at: z.string().optional().describe("Scheduled publish time (ISO 8601)"),
      media_urls: z.array(z.string()).optional().describe("Array of media URLs"),
      project_id: z.string().uuid().optional().describe("Project ID to associate with"),
    },
    async (params) => {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("content_posts")
        .insert(params)
        .select()
        .single();

      if (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error as SupabaseError) }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
      };
    }
  );
}
