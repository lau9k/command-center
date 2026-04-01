import { NextRequest, NextResponse } from "next/server";
import { startOfMonth, endOfMonth } from "date-fns";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const search = searchParams.get("q") ?? searchParams.get("search");
  const month = searchParams.get("month"); // e.g. "2026-03"
  const project = searchParams.get("project"); // project name, e.g. "meek"

  // Try joining projects via FK; fall back to plain select if FK doesn't exist
  let joinFailed = false;
  let query = supabase
    .from("content_posts")
    .select("*, projects:project_id(id, name, color)")
    .order("scheduled_for", { ascending: false, nullsFirst: false });

  if (status) {
    query = query.eq("status", status);
  }
  if (platform) {
    query = query.or(
      `platform.eq.${platform},platforms.cs.["${platform}"]`
    );
  }
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,body.ilike.%${search}%,caption.ilike.%${search}%`
    );
  }

  // Filter by month: ?month=2026-03
  if (month) {
    const parsed = new Date(`${month}-01T00:00:00Z`);
    if (!isNaN(parsed.getTime())) {
      const monthStart = startOfMonth(parsed).toISOString();
      const monthEnd = endOfMonth(parsed).toISOString();
      query = query.or(
        `and(scheduled_at.gte.${monthStart},scheduled_at.lte.${monthEnd}),and(scheduled_for.gte.${monthStart},scheduled_for.lte.${monthEnd})`
      );
    }
  }

  // Filter by project name: ?project=meek
  if (project) {
    const { data: projectRow } = await supabase
      .from("projects")
      .select("id")
      .ilike("name", project)
      .single();

    if (projectRow) {
      query = query.eq("project_id", projectRow.id);
    } else {
      return NextResponse.json({ data: [] });
    }
  }

  let { data, error } = await query;

  // If the projects FK join fails (relationship not found), retry without it
  if (error?.message?.includes("relationship")) {
    joinFailed = true;
    let fallbackQuery = supabase
      .from("content_posts")
      .select("*")
      .order("scheduled_for", { ascending: false, nullsFirst: false });

    if (status) {
      fallbackQuery = fallbackQuery.eq("status", status);
    }
    if (platform) {
      fallbackQuery = fallbackQuery.or(
        `platform.eq.${platform},platforms.cs.["${platform}"]`
      );
    }
    if (search) {
      fallbackQuery = fallbackQuery.or(
        `title.ilike.%${search}%,body.ilike.%${search}%,caption.ilike.%${search}%`
      );
    }
    if (month) {
      const parsed = new Date(`${month}-01T00:00:00Z`);
      if (!isNaN(parsed.getTime())) {
        const monthStart = startOfMonth(parsed).toISOString();
        const monthEnd = endOfMonth(parsed).toISOString();
        fallbackQuery = fallbackQuery.or(
          `and(scheduled_at.gte.${monthStart},scheduled_at.lte.${monthEnd}),and(scheduled_for.gte.${monthStart},scheduled_for.lte.${monthEnd})`
        );
      }
    }
    if (project) {
      const { data: projectRow } = await supabase
        .from("projects")
        .select("id")
        .ilike("name", project)
        .single();
      if (projectRow) {
        fallbackQuery = fallbackQuery.eq("project_id", projectRow.id);
      }
    }

    const fallbackResult = await fallbackQuery;
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, _meta: { joinFailed } });
});
