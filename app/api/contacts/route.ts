import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createContactSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { searchContacts, batchGetMemoryCounts } from "@/lib/personize/actions";
import { syncToPersonize } from "@/lib/personize/sync";
import { createContact as createContactDb } from "@/lib/api/contacts";

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

      const enrichedContacts = contacts.map((c) => ({
        ...c,
        enrichment_eligible: !c.job_title || !c.company,
      }));
      const eligibleCount = enrichedContacts.filter((c) => c.enrichment_eligible).length;

      return NextResponse.json({
        data: enrichedContacts,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          hasMore: result.hasMore,
        },
        source: "personize",
        enrichment: {
          eligible_count: eligibleCount,
          total: enrichedContacts.length,
        },
      });
    } catch (error) {
      console.error("[API] Personize search failed, falling back to Supabase:", error);
      // Fall through to Supabase
    }
  }

  // Supabase fallback (with pagination)
  const supabase = createServiceClient();

  // Determine sort column — allow last_interaction_date with updated_at fallback
  const sortColumn = sort === "last_interaction_date" ? "last_interaction_date" : "updated_at";

  let dbQuery = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .order(sortColumn, { ascending: false, nullsFirst: false });

  if (query) {
    dbQuery = dbQuery.or(
      `name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`
    );
  }
  if (tag) {
    dbQuery = dbQuery.contains("tags", [tag]);
  }
  if (status) {
    dbQuery = dbQuery.eq("status", status);
  }
  if (contactSource) {
    dbQuery = dbQuery.eq("source", contactSource);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  dbQuery = dbQuery.range(from, to);

  const { data, count, error } = await dbQuery;

  if (error) throw error;

  const total = count ?? 0;
  const contacts = data ?? [];

  // Batch-fetch conversation stats for contacts in a single query
  const contactIds = contacts
    .map((c) => c.id)
    .filter((id): id is string => Boolean(id));

  let convStatsMap = new Map<string, { conv_count: number; msg_count: number }>();
  if (contactIds.length > 0) {
    try {
      const { data: convData } = await supabase
        .from("conversations")
        .select("contact_id, metadata")
        .in("contact_id", contactIds);

      if (convData) {
        for (const row of convData) {
          if (!row.contact_id) continue;
          const existing = convStatsMap.get(row.contact_id) ?? { conv_count: 0, msg_count: 0 };
          existing.conv_count += 1;
          const msgCount = (row.metadata as Record<string, unknown>)?.message_count;
          existing.msg_count += (typeof msgCount === "number" ? msgCount : parseInt(String(msgCount ?? "0"), 10)) || 0;
          convStatsMap.set(row.contact_id, existing);
        }
      }
    } catch (err) {
      console.error("[API] Conversation stats batch fetch failed:", err);
      // Graceful degradation — keep contacts without conversation stats
    }
  }

  const supabaseContacts = contacts.map((c) => {
    const stats = convStatsMap.get(c.id);
    return {
      ...c,
      has_conversation: stats ? stats.conv_count > 0 : false,
      message_count: stats?.msg_count ?? 0,
      enrichment_eligible: !c.job_title || !c.company,
    };
  });
  const supabaseEligibleCount = supabaseContacts.filter((c) => c.enrichment_eligible).length;

  return NextResponse.json({
    data: supabaseContacts,
    pagination: {
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    },
    source: "supabase",
    enrichment: {
      eligible_count: supabaseEligibleCount,
      total: supabaseContacts.length,
    },
  });
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
