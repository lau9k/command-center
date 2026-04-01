import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import type { SearchResult, SearchEntityType } from "@/lib/search";

export const dynamic = "force-dynamic";

const ENTITY_TYPES: SearchEntityType[] = [
  "task",
  "contact",
  "pipeline",
  "content",
  "sponsor",
  "project",
  "meeting",
];

const searchParamsSchema = z.object({
  q: z.string().min(2).max(200),
  type: z
    .enum(["task", "contact", "pipeline", "content", "sponsor", "project", "meeting"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(25).default(5),
});

interface GroupedSearchResponse {
  results: SearchResult[];
  groups: Record<string, { items: SearchResult[]; total: number }>;
  totalCount: number;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const parsed = searchParamsSchema.safeParse({
    q: searchParams.get("q"),
    type: searchParams.get("type") || undefined,
    limit: searchParams.get("limit") || undefined,
  });

  if (!parsed.success) {
    const empty: GroupedSearchResponse = {
      results: [],
      groups: {},
      totalCount: 0,
    };
    return NextResponse.json(empty);
  }

  const { q, type: typeFilter, limit } = parsed.data;
  const query = q.trim();
  const supabase = createServiceClient();
  const pattern = `%${query}%`;

  const typesToSearch = typeFilter
    ? [typeFilter]
    : ENTITY_TYPES;

  async function runEntityQuery(entityType: SearchEntityType) {
    switch (entityType) {
      case "task":
        return supabase
          .from("tasks")
          .select("id, project_id, title, status, priority", { count: "exact" })
          .ilike("title", pattern)
          .limit(limit);
      case "contact":
        return supabase
          .from("contacts")
          .select("id, project_id, name, company, email, role", { count: "exact" })
          .or(`name.ilike.${pattern},company.ilike.${pattern},email.ilike.${pattern}`)
          .limit(limit);
      case "pipeline":
        return supabase
          .from("pipeline_items")
          .select("id, project_id, title, stage_id", { count: "exact" })
          .ilike("title", pattern)
          .limit(limit);
      case "content":
        return supabase
          .from("content_posts")
          .select("id, project_id, title, platform, status", { count: "exact" })
          .or(`title.ilike.${pattern},caption.ilike.${pattern}`)
          .limit(limit);
      case "sponsor":
        return supabase
          .from("sponsors")
          .select("id, name, tier, status, contact_name", { count: "exact" })
          .or(`name.ilike.${pattern},contact_name.ilike.${pattern}`)
          .limit(limit);
      case "project":
        return supabase
          .from("projects")
          .select("id, name, status", { count: "exact" })
          .ilike("name", pattern)
          .limit(limit);
      case "meeting":
        return supabase
          .from("meetings")
          .select("id, title, meeting_date, status", { count: "exact" })
          .ilike("title", pattern)
          .limit(limit);
    }
  }

  const rawResults = await Promise.all(
    typesToSearch.map((t) => runEntityQuery(t))
  );

  const results: SearchResult[] = [];
  const groups: Record<string, { items: SearchResult[]; total: number }> = {};

  for (let i = 0; i < typesToSearch.length; i++) {
    const entityType = typesToSearch[i];
    const { data, count } = rawResults[i];
    if (!data) continue;

    const rows = data as Record<string, unknown>[];
    const items: SearchResult[] = rows.map((row) =>
      mapToSearchResult(entityType, row)
    );

    results.push(...items);
    groups[entityType] = {
      items,
      total: count ?? items.length,
    };
  }

  const response: GroupedSearchResponse = {
    results,
    groups,
    totalCount: Object.values(groups).reduce((sum, g) => sum + g.total, 0),
  };

  return NextResponse.json(response);
});

function mapToSearchResult(
  type: SearchEntityType,
  row: Record<string, unknown>
): SearchResult {
  switch (type) {
    case "task":
      return {
        id: row.id as string,
        type: "task",
        title: row.title as string,
        subtitle:
          [row.status, row.priority].filter(Boolean).join(" \u00B7 ") || null,
        href: row.project_id
          ? `/projects/${row.project_id}/tasks`
          : "/tasks",
      };
    case "contact":
      return {
        id: row.id as string,
        type: "contact",
        title: row.name as string,
        subtitle: (row.company as string) || (row.email as string) || null,
        href: row.project_id
          ? `/projects/${row.project_id}/contacts`
          : "/contacts",
      };
    case "pipeline":
      return {
        id: row.id as string,
        type: "pipeline",
        title: row.title as string,
        subtitle: (row.stage_id as string) || null,
        href: `/projects/${row.project_id}/pipeline`,
      };
    case "content":
      return {
        id: row.id as string,
        type: "content",
        title: (row.title as string) || "Untitled Post",
        subtitle:
          [row.platform, row.status].filter(Boolean).join(" \u00B7 ") || null,
        href: "/content",
      };
    case "sponsor":
      return {
        id: row.id as string,
        type: "sponsor",
        title: row.name as string,
        subtitle:
          [row.tier, row.status].filter(Boolean).join(" \u00B7 ") || null,
        href: `/sponsors/${row.id}`,
      };
    case "project":
      return {
        id: row.id as string,
        type: "project",
        title: row.name as string,
        subtitle: (row.status as string) || null,
        href: `/projects/${row.id}`,
      };
    case "meeting":
      return {
        id: row.id as string,
        type: "meeting",
        title: row.title as string,
        subtitle:
          [
            row.meeting_date
              ? new Date(row.meeting_date as string).toLocaleDateString()
              : null,
            row.status,
          ]
            .filter(Boolean)
            .join(" \u00B7 ") || null,
        href: `/meetings/${row.id}`,
      };
  }
}
