import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateContentPostSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { uuidParam } from "@/lib/validations";
import { syncToPersonize } from "@/lib/personize/sync";

export const PATCH = withErrorHandler(async function PATCH(
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  if (!id || !uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateContentPostSchema.safeParse({ ...body, id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id: _id, ...updates } = parsed.data;

  const { data, error } = await supabase
    .from("content_posts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  // Sync to Personize in the background — don't block the response
  syncToPersonize({
    table: "content_posts",
    recordId: data.id,
    content: JSON.stringify(data),
  }).catch((err) => {
    console.error(`[API] PATCH /api/content-posts/${id} sync error:`, err);
  });

  return NextResponse.json(data);
});
