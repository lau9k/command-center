import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupabaseClient } from "../lib/supabase.js";
import { formatError, SupabaseError } from "../lib/errors.js";

export function registerTaskTools(server: McpServer) {
  server.tool(
    "query_tasks",
    "Search and filter tasks with priority sorting. Supports filtering by status, priority, project, and search term.",
    {
      search: z.string().optional().describe("Search by title (case-insensitive)"),
      status: z.enum(["todo", "in_progress", "done"]).optional().describe("Filter by task status"),
      priority: z.enum(["critical", "high", "medium", "low"]).optional().describe("Filter by priority"),
      project_id: z.string().uuid().optional().describe("Filter by project ID"),
      assignee: z.string().optional().describe("Filter by assignee name"),
      limit: z.number().min(1).max(100).default(50).describe("Max results to return"),
      offset: z.number().min(0).default(0).describe("Offset for pagination"),
    },
    async (params) => {
      const supabase = getSupabaseClient();

      let query = supabase
        .from("tasks")
        .select("*, projects(id, name, color)", { count: "exact" })
        .order("priority", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .range(params.offset, params.offset + params.limit - 1);

      if (params.search) {
        query = query.ilike("title", `%${params.search}%`);
      }

      if (params.status) {
        query = query.eq("status", params.status);
      }

      if (params.priority) {
        query = query.eq("priority", params.priority);
      }

      if (params.project_id) {
        query = query.eq("project_id", params.project_id);
      }

      if (params.assignee) {
        query = query.ilike("assignee", `%${params.assignee}%`);
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
    "create_task",
    "Insert a new task. Requires a title at minimum.",
    {
      title: z.string().min(1).describe("Task title (required)"),
      description: z.string().optional().describe("Task description"),
      status: z.enum(["todo", "in_progress", "done"]).default("todo").describe("Task status"),
      priority: z.enum(["critical", "high", "medium", "low"]).default("medium").describe("Task priority"),
      due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
      assignee: z.string().optional().describe("Person assigned to this task"),
      context: z.string().optional().describe("Additional context"),
      tags: z.array(z.string()).optional().describe("Array of tags"),
      project_id: z.string().uuid().optional().describe("Project ID to associate with"),
    },
    async (params) => {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("tasks")
        .insert(params)
        .select("*, projects(id, name, color)")
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

  server.tool(
    "update_task",
    "Update an existing task by ID, including status changes.",
    {
      id: z.string().uuid().describe("Task ID to update"),
      title: z.string().min(1).optional().describe("Updated title"),
      description: z.string().optional().describe("Updated description"),
      status: z.enum(["todo", "in_progress", "done"]).optional().describe("Updated status"),
      priority: z.enum(["critical", "high", "medium", "low"]).optional().describe("Updated priority"),
      due_date: z.string().optional().describe("Updated due date (YYYY-MM-DD)"),
      assignee: z.string().optional().describe("Updated assignee"),
      context: z.string().optional().describe("Updated context"),
      tags: z.array(z.string()).optional().describe("Updated tags"),
    },
    async (params) => {
      const { id, ...updates } = params;
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select("*, projects(id, name, color)")
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
