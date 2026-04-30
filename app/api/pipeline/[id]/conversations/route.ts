import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { uuidParam } from "@/lib/validations";
import { getDealConversations } from "@/lib/queries/deal-conversations";

export const GET = withErrorHandler(withAuth(async function GET(
  _request: NextRequest,
  _user,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  if (!id || !uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: deal, error } = await supabase
    .from("pipeline_items")
    .select("id, metadata")
    .eq("id", id)
    .single();

  if (error || !deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  const meta = (deal.metadata ?? {}) as Record<string, unknown>;
  const primary = Array.isArray(meta.primary_contacts)
    ? (meta.primary_contacts as string[])
    : Array.isArray(meta.contact_ids)
    ? (meta.contact_ids as string[])
    : [];

  const items = await getDealConversations(primary.filter((s) => typeof s === "string"));

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "private, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}));
