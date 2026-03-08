import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceClient();

  const [stagesResult, itemsResult] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, name, slug, sort_order, color, pipeline_id")
      .order("sort_order", { ascending: true }),
    supabase
      .from("pipeline_items")
      .select(
        "id, pipeline_id, stage_id, project_id, title, entity_type, metadata, sort_order, created_at, updated_at"
      )
      .order("sort_order", { ascending: true }),
  ]);

  if (stagesResult.error) {
    return NextResponse.json(
      { error: stagesResult.error.message },
      { status: 500 }
    );
  }

  if (itemsResult.error) {
    return NextResponse.json(
      { error: itemsResult.error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    stages: stagesResult.data ?? [],
    items: itemsResult.data ?? [],
  });
}
