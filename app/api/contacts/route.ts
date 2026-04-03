import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createContactSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { searchContacts, batchGetMemoryCounts } from "@/lib/personize/actions";
import { syncToPersonize } from "@/lib/personize/sync";
import {
  getContacts as getContactsDb,
  createContact as createContactDb,
} from "@/lib/api/contacts";

export const GET = withErrorHandler(withAuth(async function GET(request, _user) {
  const { searchParams } = request.nextUrl;

  const query = searchParams.get("q") ?? searchParams.get("search") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);
  const sort = searchParams.get("sort") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const contactSource = searchParams.get("contactSource") ?? undefined;
  const source = searchParams.get("source") ?? "personize";

  // Try Personize first (unless explicitly requesting supabase)
  if (source !== "supabase" && process.env.PERSONIZE_SECRET_KEY) {
    try {
      const result = await searchContacts(query, page, pageSize, sort);

      // Batch-fetch memory counts for contacts that don't already have them
      let contacts = result.contacts;
      const needsCounts = contacts.filter(
        (c) => c.record_id && (c.memory_count === undefined || c.memory_count === null || c.memory_count === 0)
      );
      if (needsCounts.length > 0) {
        try {
          const recordIds = needsCounts
            .map((c) => c.record_id)
            .filter((id): id is string => Boolean(id));
          const memoryCounts = await batchGetMemoryCounts(recordIds);
          contacts = contacts.map((c) => ({
            ...c,
            memory_count: c.record_id
              ? (memoryCounts.get(c.record_id) ?? c.memory_count ?? null)
              : (c.memory_count ?? null),
          }));
        } catch (err) {
          console.error("[API] Memory count batch fetch failed:", err);
          // Graceful degradation — keep contacts without counts
        }
      }

      // Apply client-side tag filter if provided
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

  const data = await getContactsDb(supabase, {
    search: query ?? searchParams.get("search") ?? undefined,
    tag,
    status,
    contactSource,
  });

  return NextResponse.json({ data, source: "supabase" });
}));

export const POST = withErrorHandler(withAuth(async function POST(request, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = await createContactDb(supabase, parsed.data);

  // Sync to Personize in the background — don't block the response
  syncToPersonize({
    table: "contacts",
    recordId: data.id,
    content: JSON.stringify(data),
    email: data.email ?? undefined,
  }).catch((err) => {
    console.error("[API] POST /api/contacts sync error:", err);
  });

  return NextResponse.json({ data }, { status: 201 });
}));
