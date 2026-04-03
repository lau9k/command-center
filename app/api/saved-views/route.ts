import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createSavedViewSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withErrorHandler(withAuth(async function GET(request, _user) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const entityType = searchParams.get("entity_type");

  let query = supabase
    .from("saved_views")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}));

export const POST = withErrorHandler(withAuth(async function POST(request, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createSavedViewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("saved_views")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}));
