import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupabaseClient } from "../lib/supabase.js";
import { formatError, SupabaseError } from "../lib/errors.js";

export function registerDashboardTools(server: McpServer) {
  server.tool(
    "get_dashboard_kpis",
    "Get aggregated dashboard metrics: total contacts, tasks breakdown by status, pipeline items count, and content posts count.",
    {},
    async () => {
      const supabase = getSupabaseClient();

      const [contacts, tasks, pipelineItems, contentPosts] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }),
        supabase.from("tasks").select("id, status"),
        supabase.from("pipeline_items").select("id", { count: "exact", head: true }),
        supabase.from("content_posts").select("id", { count: "exact", head: true }),
      ]);

      if (contacts.error) {
        return {
          content: [{ type: "text" as const, text: formatError(contacts.error as SupabaseError) }],
          isError: true,
        };
      }

      if (tasks.error) {
        return {
          content: [{ type: "text" as const, text: formatError(tasks.error as SupabaseError) }],
          isError: true,
        };
      }

      const taskData = tasks.data ?? [];
      const tasksByStatus = {
        todo: taskData.filter((t) => t.status === "todo").length,
        in_progress: taskData.filter((t) => t.status === "in_progress").length,
        done: taskData.filter((t) => t.status === "done").length,
      };

      const kpis = {
        contacts_count: contacts.count ?? 0,
        tasks_total: taskData.length,
        tasks_by_status: tasksByStatus,
        pipeline_items_count: pipelineItems.count ?? 0,
        content_posts_count: contentPosts.count ?? 0,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(kpis, null, 2) }],
      };
    }
  );
}
