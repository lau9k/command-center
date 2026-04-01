import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const projectId = searchParams.get("project_id");
  const platform = searchParams.get("platform");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query params are required (ISO dates)" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  let query = supabase
    .from("content_posts")
    .select("*, projects:project_id(id, name, color)")
    .or(
      `and(scheduled_at.gte.${start},scheduled_at.lte.${end}),and(scheduled_for.gte.${start},scheduled_for.lte.${end})`
    )
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  if (platform) {
    query = query.or(
      `platform.eq.${platform},platforms.cs.["${platform}"]`
    );
  }

  let { data, error } = await query;

  // If the projects FK join fails, retry without it
  if (error?.message?.includes("relationship")) {
    let fallbackQuery = supabase
      .from("content_posts")
      .select("*")
      .or(
        `and(scheduled_at.gte.${start},scheduled_at.lte.${end}),and(scheduled_for.gte.${start},scheduled_for.lte.${end})`
      )
      .order("scheduled_at", { ascending: true, nullsFirst: false });

    if (projectId) {
      fallbackQuery = fallbackQuery.eq("project_id", projectId);
    }
    if (platform) {
      fallbackQuery = fallbackQuery.or(
        `platform.eq.${platform},platforms.cs.["${platform}"]`
      );
    }

    const fallbackResult = await fallbackQuery;
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
