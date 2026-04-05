import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { cached } from "@/lib/cache/redis";

const createConversationSchema = z.object({
  contact_id: z.string().uuid().optional().nullable(),
  summary: z.string().min(1, "Summary is required").max(10000),
  channel: z.enum(["email", "meeting", "linkedin", "phone", "other"]),
  last_message_at: z.string().datetime().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const source = searchParams.get("source");
  const contactId = searchParams.get("contact_id");
  const search = searchParams.get("search") ?? searchParams.get("q");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const supabase = createServiceClient();

  let query = supabase
    .from("conversations")
    .select("*, contacts(id, name, email, company)")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (source) {
    query = query.eq("channel", source);
  }

  if (contactId) {
    query = query.eq("contact_id", contactId);
  }

  if (search) {
    query = query.or(
      `summary.ilike.%${search}%,channel.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Compute channel counts using count queries (avoids PostgREST 1000-row default limit)
  const primaryChannelIds = await cached<string[]>(
    "conversations:channels:list",
    async () => {
      const { data: channelTypes } = await supabase
        .from("channel_types")
        .select("id")
        .order("sort_order", { ascending: true });
      return (channelTypes ?? []).map((ct) => ct.id);
    },
    { ttlMs: 10 * 60 * 1000 },
  );

  // Get total count and per-channel counts in parallel
  let totalCountQuery = supabase
    .from("conversations")
    .select("id", { count: "exact", head: true });
  if (contactId) totalCountQuery = totalCountQuery.eq("contact_id", contactId);

  const channelCountPromises = primaryChannelIds.map(async (ch) => {
    let q = supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("channel", ch);
    if (contactId) q = q.eq("contact_id", contactId);
    const { count } = await q;
    return [ch, count ?? 0] as [string, number];
  });

  const [totalRes, ...channelResults] = await Promise.all([
    totalCountQuery,
    ...channelCountPromises,
  ]);

  const channelCounts: Record<string, number> = {
    all: totalRes.count ?? 0,
  };
  let primaryTotal = 0;
  for (const [ch, cnt] of channelResults) {
    channelCounts[ch] = cnt;
    primaryTotal += cnt;
  }
  channelCounts.other = Math.max(0, (totalRes.count ?? 0) - primaryTotal);

  return NextResponse.json({ data, channel_counts: channelCounts });
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      ...parsed.data,
      user_id: "00000000-0000-0000-0000-000000000000",
      last_message_at: parsed.data.last_message_at ?? new Date().toISOString(),
    })
    .select("*, contacts(id, name, email, company)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
});
