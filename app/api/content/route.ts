import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const search = searchParams.get("q") ?? searchParams.get("search");

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

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
});
