import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { z } from "zod";

const updatePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  default_project_filter: z.string().uuid().nullable().optional(),
  display_name: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
});

export const GET = withErrorHandler(withAuth(async function GET(request, _user) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json(
      { error: "Missing user_id parameter" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return defaults if no preferences exist yet
  const preferences = data ?? {
    theme: "system",
    default_project_filter: null,
  };

  return NextResponse.json({ data: preferences });
}));

export const PUT = withErrorHandler(withAuth(async function PUT(request, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { user_id, ...rest } = body;

  if (!user_id) {
    return NextResponse.json(
      { error: "Missing user_id in request body" },
      { status: 400 }
    );
  }

  const parsed = updatePreferencesSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id,
        ...parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}));
