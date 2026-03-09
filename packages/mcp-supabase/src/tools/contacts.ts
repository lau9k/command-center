import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSupabaseClient } from "../lib/supabase.js";
import { formatError, SupabaseError } from "../lib/errors.js";

export function registerContactTools(server: McpServer) {
  server.tool(
    "query_contacts",
    "Search and filter contacts with pagination. Supports filtering by tag, search term (name/email), source, and status.",
    {
      search: z.string().optional().describe("Search by name or email (case-insensitive)"),
      tag: z.string().optional().describe("Filter by tag"),
      source: z.enum(["manual", "referral", "website", "linkedin", "other"]).optional().describe("Filter by contact source"),
      status: z.enum(["active", "inactive", "lead", "customer"]).optional().describe("Filter by contact status"),
      limit: z.number().min(1).max(100).default(50).describe("Max results to return"),
      offset: z.number().min(0).default(0).describe("Offset for pagination"),
    },
    async (params) => {
      const supabase = getSupabaseClient();

      let query = supabase
        .from("contacts")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(params.offset, params.offset + params.limit - 1);

      if (params.search) {
        query = query.or(
          `name.ilike.%${params.search}%,email.ilike.%${params.search}%`
        );
      }

      if (params.tag) {
        query = query.contains("tags", [params.tag]);
      }

      if (params.source) {
        query = query.eq("source", params.source);
      }

      if (params.status) {
        query = query.eq("qualified_status", params.status);
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
    "create_contact",
    "Insert a new contact. Requires a name at minimum.",
    {
      name: z.string().min(1).describe("Contact name (required)"),
      email: z.string().email().optional().describe("Contact email address"),
      company: z.string().optional().describe("Company name"),
      source: z.enum(["manual", "referral", "website", "linkedin", "other"]).optional().describe("How this contact was acquired"),
      linkedin_url: z.string().url().optional().describe("LinkedIn profile URL"),
      tags: z.array(z.string()).optional().describe("Array of tags"),
      score: z.number().min(0).max(100).optional().describe("Contact score (0-100)"),
      next_action: z.string().optional().describe("Next action or notes"),
      project_id: z.string().uuid().optional().describe("Project ID to associate with"),
    },
    async (params) => {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("contacts")
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

  server.tool(
    "update_contact",
    "Update an existing contact by ID.",
    {
      id: z.string().uuid().describe("Contact ID to update"),
      name: z.string().min(1).optional().describe("Updated name"),
      email: z.string().email().optional().describe("Updated email"),
      company: z.string().optional().describe("Updated company"),
      source: z.enum(["manual", "referral", "website", "linkedin", "other"]).optional(),
      linkedin_url: z.string().url().optional().describe("Updated LinkedIn URL"),
      tags: z.array(z.string()).optional().describe("Updated tags"),
      score: z.number().min(0).max(100).optional().describe("Updated score"),
      next_action: z.string().optional().describe("Updated next action"),
      last_contact_date: z.string().optional().describe("Last contact date (YYYY-MM-DD)"),
    },
    async (params) => {
      const { id, ...updates } = params;
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
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

  server.tool(
    "delete_contact",
    "Soft-delete a contact by ID (sets status to inactive).",
    {
      id: z.string().uuid().describe("Contact ID to soft-delete"),
    },
    async (params) => {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from("contacts")
        .update({ qualified_status: "inactive" })
        .eq("id", params.id)
        .select("id, name, qualified_status")
        .single();

      if (error) {
        return {
          content: [{ type: "text" as const, text: formatError(error as SupabaseError) }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ message: "Contact soft-deleted (set to inactive)", data }, null, 2),
        }],
      };
    }
  );
}
