import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withAuth(async function GET(_request, _user) {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("memory_stats")
      .select("count");

    if (error) {
      return NextResponse.json({ totalRecords: 0 });
    }

    const totalRecords = (data ?? []).reduce(
      (sum, row) => sum + (row.count ?? 0),
      0
    );

    return NextResponse.json({ totalRecords });
  } catch {
    return NextResponse.json({ totalRecords: 0 });
  }
});
