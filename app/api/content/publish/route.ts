import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { publishContentItemSchema } from "@/lib/validations";
import { createPost } from "@/lib/late-so";
import { withErrorHandler } from "@/lib/api-error-handler";

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = publishContentItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Fetch the content item
  const { data: item, error: fetchError } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", parsed.data.contentItemId)
    .single();

  if (fetchError || !item) {
    return NextResponse.json(
      { error: fetchError?.message ?? "Content item not found" },
      { status: 404 }
    );
  }

  if (item.status === "published") {
    return NextResponse.json(
      { error: "Content item is already published" },
      { status: 400 }
    );
  }

  // Call Late.so API
  const latesoResponse = await createPost({
    text: item.body,
    platform: item.platform,
    scheduledFor: item.scheduled_for ?? undefined,
  });

  // Determine new status based on whether it was scheduled
  const newStatus = item.scheduled_for ? "scheduled" : "published";
  const updateFields: Record<string, unknown> = {
    status: newStatus,
    late_so_id: latesoResponse.id,
  };
  if (newStatus === "published") {
    updateFields.published_at = new Date().toISOString();
  }

  const { data: updated, error: updateError } = await supabase
    .from("content_items")
    .update(updateFields)
    .eq("id", parsed.data.contentItemId)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
});
