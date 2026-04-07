import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { updateResourceSchema } from "@/lib/types/resources";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withErrorHandler(
  withAuth(async (_request, _user, context) => {
    const { id } = await context!.params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "PGRST116" ? 404 : 500 }
      );
    }

    return NextResponse.json({ data });
  })
);

export const PATCH = withErrorHandler(
  withAuth(async (request, _user, context) => {
    const { id } = await context!.params;
    const supabase = createServiceClient();
    const body = await request.json();

    const parsed = updateResourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("resources")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  })
);

export const DELETE = withErrorHandler(
  withAuth(async (_request, _user, context) => {
    const { id } = await context!.params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("resources")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  })
);
