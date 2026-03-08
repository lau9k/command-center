import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { item_id } = body as { item_id?: string };

  if (!item_id) {
    return NextResponse.json(
      { error: "item_id is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("plaid_items")
    .update({ status: "inactive" })
    .eq("id", item_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
