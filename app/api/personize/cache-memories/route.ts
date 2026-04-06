import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import client from "@/lib/personize/client";

const BATCH_LIMIT = 50;
const RATE_LIMIT_MS = 500;

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const cronKey = request.headers.get("x-cron-key");

  const apiSecret = process.env.API_SECRET;
  const cronSecret = process.env.CRON_SECRET;

  return (
    (!!apiSecret && (bearerToken === apiSecret || cronKey === apiSecret)) ||
    (!!cronSecret && (bearerToken === cronSecret || cronKey === cronSecret))
  );
}

function getServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface SmartRecallResult {
  text: string;
  score: number;
  topic?: string;
}

async function handleCacheMemories(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceRoleClient();

  try {
    // Fetch contacts that are synced to Personize but have stale or missing cache
    const { data: contacts, error: fetchError } = await supabase
      .from("contacts")
      .select(`
        id,
        email,
        contact_memory_cache (cached_at)
      `)
      .not("personize_synced_at", "is", null)
      .not("email", "is", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) {
      console.error("[API] /api/personize/cache-memories fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch contacts", details: fetchError.message },
        { status: 500 }
      );
    }

    // Filter to contacts with stale or missing cache
    const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const staleContacts = (contacts ?? []).filter((c) => {
      const cache = c.contact_memory_cache as
        | { cached_at: string }[]
        | { cached_at: string }
        | null;
      if (!cache) return true;
      const cachedAt = Array.isArray(cache) ? cache[0]?.cached_at : cache.cached_at;
      if (!cachedAt) return true;
      return cachedAt < staleThreshold;
    });

    if (staleContacts.length === 0) {
      return NextResponse.json({
        success: true,
        cached: 0,
        failed: 0,
        remaining: 0,
      });
    }

    let cached = 0;
    let failed = 0;

    for (let i = 0; i < staleContacts.length; i++) {
      const contact = staleContacts[i];

      try {
        const result = await client.memory.smartRecall({
          query: "summary key facts recent context",
          email: contact.email,
          include_property_values: true,
        });

        const results: SmartRecallResult[] =
          (result as { data?: { results?: SmartRecallResult[] } })?.data?.results ?? [];

        const topSnippets = results.slice(0, 3).map((r) => ({
          text: r.text,
          score: r.score,
          source: r.topic ?? "unknown",
        }));

        const digestText = results[0]?.text
          ? results[0].text.slice(0, 200)
          : null;

        const { error: upsertError } = await supabase
          .from("contact_memory_cache")
          .upsert(
            {
              contact_id: contact.id,
              top_snippets: topSnippets,
              digest_text: digestText,
              cached_at: new Date().toISOString(),
              memory_count: results.length,
            },
            { onConflict: "contact_id" }
          );

        if (upsertError) {
          console.error(
            `[API] /api/personize/cache-memories upsert failed for ${contact.id}:`,
            upsertError
          );
          failed++;
        } else {
          cached++;
        }
      } catch (recallError) {
        console.error(
          `[API] /api/personize/cache-memories smartRecall failed for ${contact.id}:`,
          recallError
        );
        failed++;
      }

      // Rate limit between calls (skip after last)
      if (i < staleContacts.length - 1) {
        await delay(RATE_LIMIT_MS);
      }
    }

    // Count remaining stale contacts
    const { count: totalSynced } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .not("personize_synced_at", "is", null)
      .not("email", "is", null);

    const { count: freshCached } = await supabase
      .from("contact_memory_cache")
      .select("contact_id", { count: "exact", head: true })
      .gte("cached_at", staleThreshold);

    const remaining = (totalSynced ?? 0) - (freshCached ?? 0);

    return NextResponse.json({
      success: true,
      cached,
      failed,
      remaining: Math.max(0, remaining),
    });
  } catch (error) {
    console.error("[API] /api/personize/cache-memories failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleCacheMemories(request);
}

export async function POST(request: NextRequest) {
  return handleCacheMemories(request);
}
