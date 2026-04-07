import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchTelegramStats } from "@/lib/telegram/community";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  const supabase = createServiceClient();

  // 1. Check for a recent cached row (< 5 min old)
  const { data: cached } = await supabase
    .from("community_stats")
    .select("member_count, chat_title, chat_description, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < CACHE_TTL_MS) {
      return NextResponse.json({
        memberCount: cached.member_count,
        title: cached.chat_title,
        description: cached.chat_description,
        fetchedAt: cached.fetched_at,
        source: "cache",
      });
    }
  }

  // 2. Cache is stale or missing — call Telegram API
  const stats = await fetchTelegramStats();

  if (!stats) {
    // Telegram API unreachable — return last cached value if available
    if (cached) {
      return NextResponse.json({
        memberCount: cached.member_count,
        title: cached.chat_title,
        description: cached.chat_description,
        fetchedAt: cached.fetched_at,
        source: "stale-cache",
      });
    }
    return NextResponse.json(
      { error: "Telegram API unreachable and no cached data available" },
      { status: 503 }
    );
  }

  // 3. Upsert fresh stats into Supabase
  const { error: insertError } = await supabase
    .from("community_stats")
    .insert({
      member_count: stats.memberCount,
      chat_title: stats.title,
      chat_description: stats.description,
      fetched_at: stats.fetchedAt,
    });

  if (insertError) {
    console.error("[telegram/stats] Failed to cache stats:", insertError.message);
  }

  return NextResponse.json({
    memberCount: stats.memberCount,
    title: stats.title,
    description: stats.description,
    fetchedAt: stats.fetchedAt,
    source: "live",
  });
}));
