import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-guard";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const GET = withAuth(async () => {
  const supabase = getServiceRoleClient();

  try {
    // Total contacts
    const { count: total } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true });

    // Memorized contacts
    const { count: memorized } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .not("memorized_at", "is", null);

    // Unmemorized contacts
    const { count: unmemorized } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .is("memorized_at", null);

    // Last sync timestamp (most recent memorized_at)
    const { data: lastSync } = await supabase
      .from("contacts")
      .select("memorized_at")
      .not("memorized_at", "is", null)
      .order("memorized_at", { ascending: false })
      .limit(1)
      .single();

    // Oldest unmemorized contact
    const { data: oldestUnmemorized } = await supabase
      .from("contacts")
      .select("created_at")
      .is("memorized_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    return NextResponse.json({
      total: total ?? 0,
      memorized: memorized ?? 0,
      unmemorized: unmemorized ?? 0,
      last_sync_at: lastSync?.memorized_at ?? null,
      oldest_unmemorized_at: oldestUnmemorized?.created_at ?? null,
    });
  } catch (error) {
    console.error("[API] /api/personize/sync-contacts/status failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
