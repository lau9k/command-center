import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const importId = request.nextUrl.searchParams.get("id");

  if (!importId) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("imports")
    .select("record_count, processed_count, error_count, status")
    .eq("id", importId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Import not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    total: data.record_count,
    processed: data.processed_count,
    errors: data.error_count,
    status: data.status,
  });
}
