import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldCoverage {
  email: number;
  company: number;
  role: number;
  linkedin_url: number;
  phone: number;
}

interface MemoryDistribution {
  rich: number; // 10+ memories
  some: number; // 1-9 memories
  none: number; // 0 memories
}

interface SyncHealthDashboardData {
  total_contacts: number;
  synced_contacts: number;
  failed_contacts: number;
  last_sync_at: string | null;
  field_coverage: FieldCoverage;
  memory_distribution: MemoryDistribution;
}

// ---------------------------------------------------------------------------
// GET /api/admin/sync-health-dashboard
// ---------------------------------------------------------------------------

export const GET = withErrorHandler(withAuth(async function GET(_request, _user) {
  const supabase = createServiceClient();

  // Run all queries in parallel
  const [
    totalRes,
    syncedRes,
    failedRes,
    lastSyncRes,
    emailRes,
    companyRes,
    roleRes,
    linkedinRes,
    phoneRes,
    memoryStatsRes,
  ] = await Promise.all([
    // Total contacts
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    // Synced contacts
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .not("personize_synced_at", "is", null),
    // Failed contacts
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("personize_sync_status", "failed"),
    // Last sync time
    supabase
      .from("contacts")
      .select("personize_synced_at")
      .not("personize_synced_at", "is", null)
      .order("personize_synced_at", { ascending: false })
      .limit(1),
    // Field coverage counts
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .not("email", "is", null)
      .neq("email", ""),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .not("company", "is", null)
      .neq("company", ""),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .not("role", "is", null)
      .neq("role", ""),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .not("linkedin_url", "is", null)
      .neq("linkedin_url", ""),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .not("phone", "is", null)
      .neq("phone", ""),
    // Memory stats: per-contact rows (memory_type starts with 'contact:')
    supabase
      .from("memory_stats")
      .select("count")
      .like("memory_type", "contact:%"),
  ]);

  const total = totalRes.count ?? 0;

  // Compute field coverage percentages
  const pct = (count: number | null) =>
    total > 0 ? Math.round(((count ?? 0) / total) * 100) : 0;

  const field_coverage: FieldCoverage = {
    email: pct(emailRes.count),
    company: pct(companyRes.count),
    role: pct(roleRes.count),
    linkedin_url: pct(linkedinRes.count),
    phone: pct(phoneRes.count),
  };

  // Compute memory distribution from per-contact memory_stats rows
  const memoryRows = (memoryStatsRes.data ?? []) as { count: number }[];
  let rich = 0;
  let some = 0;
  for (const row of memoryRows) {
    if (row.count >= 10) rich++;
    else if (row.count >= 1) some++;
  }
  // Contacts with no memory_stats row at all
  const contactsWithMemoryRows = memoryRows.length;
  const none = Math.max(0, total - contactsWithMemoryRows);

  const memory_distribution: MemoryDistribution = { rich, some, none };

  const lastSyncRow = lastSyncRes.data?.[0];

  const data: SyncHealthDashboardData = {
    total_contacts: total,
    synced_contacts: syncedRes.count ?? 0,
    failed_contacts: failedRes.count ?? 0,
    last_sync_at: lastSyncRow?.personize_synced_at ?? null,
    field_coverage,
    memory_distribution,
  };

  return NextResponse.json({ data });
}));
