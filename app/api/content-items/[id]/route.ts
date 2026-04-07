import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateContentItemSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withErrorHandler(
  withAuth(async (_request, _user, context) => {
    const { id } = await context!.params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("content_items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`[API] GET /api/content-items/${id} error:`, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  })
);

export const PUT = withErrorHandler(
  withAuth(async (request, _user, context) => {
    const { id } = await context!.params;
    const supabase = createServiceClient();
    const body = await request.json();

    const parsed = updateContentItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("content_items")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error(`[API] PUT /api/content-items/${id} error:`, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  })
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, _user, context) => {
    const { id } = await context!.params;
    const supabase = createServiceClient();

    const { error } = await supabase.from("content_items").delete().eq("id", id);

    if (error) {
      console.error(`[API] DELETE /api/content-items/${id} error:`, error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  })
);
