import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { z } from "zod";

const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  default_view: z.enum(["dashboard", "pipeline", "tasks", "contacts", "content", "community", "finance"]).optional(),
  sidebar_collapsed: z.boolean().optional(),
  items_per_page: z.number().int().min(10).max(100).optional(),
});

export const GET = withErrorHandler(async function GET(request: NextRequest) {
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
    .select("theme, default_view, sidebar_collapsed, items_per_page")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const defaults = {
    theme: "system" as const,
    default_view: "dashboard" as const,
    sidebar_collapsed: false,
    items_per_page: 25,
  };

  return NextResponse.json({
    data: data ? { ...defaults, ...data } : defaults,
  });
});

export const PUT = withErrorHandler(async function PUT(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { user_id, ...rest } = body;

  if (!user_id) {
    return NextResponse.json(
      { error: "Missing user_id in request body" },
      { status: 400 }
    );
  }

  const parsed = preferencesSchema.safeParse(rest);
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
});
