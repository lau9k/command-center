import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { createServiceClient } from "@/lib/supabase/service";

export const GET = withErrorHandler(withAuth(async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || !query.trim()) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required" },
      { status: 400 }
    );
  }

  const q = query.trim();
  const supabase = createServiceClient();

  // Supabase ilike search across name, email, company, job_title
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .or(
      `name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%,job_title.ilike.%${q}%`
    )
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return NextResponse.json({
    data: data ?? [],
    query: q,
    total: data?.length ?? 0,
  });
}));
