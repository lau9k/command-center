import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createContactSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { searchContacts } from "@/lib/personize/actions";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const query = searchParams.get("q") ?? searchParams.get("search") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);
  const sort = searchParams.get("sort") ?? undefined;
  const tag = searchParams.get("tag");
  const status = searchParams.get("status");
  const contactSource = searchParams.get("contactSource");
  const source = searchParams.get("source") ?? "personize";

  // Try Personize first (unless explicitly requesting supabase)
  if (source !== "supabase" && process.env.PERSONIZE_SECRET_KEY) {
    try {
      const result = await searchContacts(query, page, pageSize, sort);

      // Apply client-side tag filter if provided
      let contacts = result.contacts;
      if (tag) {
        contacts = contacts.filter((c) => c.tags.includes(tag));
      }

      return NextResponse.json({
        data: contacts,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          hasMore: result.hasMore,
        },
        source: "personize",
      });
    } catch (error) {
      console.error("[API] Personize search failed, falling back to Supabase:", error);
      // Fall through to Supabase
    }
  }

  // Supabase fallback
  const supabase = createServiceClient();

  let supabaseQuery = supabase
    .from("contacts")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (tag) {
    supabaseQuery = supabaseQuery.contains("tags", [tag]);
  }
  if (status) {
    supabaseQuery = supabaseQuery.eq("status", status);
  }
  if (contactSource) {
    supabaseQuery = supabaseQuery.eq("source", contactSource);
  }

  const search = query ?? searchParams.get("search");
  if (search) {
    supabaseQuery = supabaseQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
  }

  const { data, error } = await supabaseQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, source: "supabase" });
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
});
