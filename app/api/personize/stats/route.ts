import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
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
}
