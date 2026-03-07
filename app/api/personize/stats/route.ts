import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
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
