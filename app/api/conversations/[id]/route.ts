import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateIdParam } from "@/lib/validations";

export const GET = withErrorHandler(async function GET(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const params = await context?.params;
  const id = params?.id ?? null;

  if (!validateIdParam(id)) {
    return NextResponse.json({ error: "Invalid conversation ID" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("*, contacts(id, name, email, company)")
    .eq("id", id)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ data });
});
