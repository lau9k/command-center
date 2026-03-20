import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

// ---------------------------------------------------------------------------
// Stable UUIDs (deterministic so upsert is idempotent on re-run)
// ---------------------------------------------------------------------------

function pipelineId(prefix: string, index: number): string {
  const hex = index.toString(16).padStart(12, "0");
  return `${prefix}-0000-0000-0000-${hex}`;
}

const PIPELINE_PREFIX = "e0000000";
const STAGE_PREFIX = "e1000000";
const DEAL_PREFIX = "e2000000";

// ---------------------------------------------------------------------------
// Auth helper (mirrors other seed endpoints)
// ---------------------------------------------------------------------------

function authenticate(req: NextRequest): NextResponse | null {
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SEED_SECRET env var is not configured" },
      { status: 500 },
    );
  }

  const provided =
    req.headers.get("x-seed-secret") ??
    req.nextUrl.searchParams.get("secret");

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

// ---------------------------------------------------------------------------
// Resolve seed user_id and project_id from existing data
// ---------------------------------------------------------------------------

async function getSeedContext(supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await supabase
    .from("projects")
    .select("id, user_id, slug")
    .eq("slug", "personize")
    .limit(1)
    .single();

  if (data) {
    return { userId: data.user_id, projectId: data.id };
  }

  // Fallback: grab any project
  const { data: fallback } = await supabase
    .from("projects")
    .select("id, user_id")
    .limit(1)
    .single();

  return {
    userId: fallback?.user_id ?? "00000000-0000-0000-0000-000000000000",
    projectId: fallback?.id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Stage definitions
// ---------------------------------------------------------------------------

const STAGES = [
  { name: "Lead", slug: "lead", sort_order: 0, color: "#3B82F6" },
  { name: "Discovery", slug: "discovery", sort_order: 1, color: "#8B5CF6" },
  { name: "Demo", slug: "demo", sort_order: 2, color: "#F59E0B" },
  { name: "Proposal", slug: "proposal", sort_order: 3, color: "#F97316" },
  { name: "Negotiation", slug: "negotiation", sort_order: 4, color: "#EC4899" },
  { name: "Closed Won", slug: "closed-won", sort_order: 5, color: "#22C55E" },
  { name: "Closed Lost", slug: "closed-lost", sort_order: 6, color: "#6B7280" },
] as const;

// ---------------------------------------------------------------------------
// Deal definitions
// ---------------------------------------------------------------------------

interface DealDef {
  title: string;
  stageSlug: string;
  value: number;
  company: string;
  contact: string;
  notes: string;
}

const DEALS: DealDef[] = [
  {
    title: "Evormore AI — MCP Integration",
    stageSlug: "demo",
    value: 2400,
    company: "Evormore AI",
    contact: "Evormore team",
    notes: "MCP integration for sovereign AI stack. Demo scheduled post-prototype.",
  },
  {
    title: "Trelent — Data Ingestion Partnership",
    stageSlug: "discovery",
    value: 0,
    company: "Trelent",
    contact: "Calum Bird",
    notes: "Partnership deal — data ingestion collab + hackathon sponsorship. No direct revenue.",
  },
  {
    title: "VeilStream — Data Sanitization",
    stageSlug: "discovery",
    value: 1200,
    company: "VeilStream",
    contact: "John Oram",
    notes: "Data sanitization layer + Personize demo planned post-spring-break.",
  },
  {
    title: "Cyrus — Self-Hosted Agent",
    stageSlug: "proposal",
    value: 5000,
    company: "Cyrus",
    contact: "Cyrus AI agent",
    notes: "Self-hosted agent deployment with Personize memory layer. Proposal sent for annual license.",
  },
  {
    title: "DAVI — Executive Meeting",
    stageSlug: "lead",
    value: 0,
    company: "DAVI",
    contact: "Cynthia Lynam",
    notes: "Meeting scheduled via Julie. TBD on scope — exploring enterprise memory use case.",
  },
  {
    title: "Nexus Health — Patient Context Engine",
    stageSlug: "demo",
    value: 8000,
    company: "Nexus Health",
    contact: "Dr. Sarah Chen",
    notes: "Healthcare context engine for patient interaction history. Demo with clinical team next week.",
  },
  {
    title: "Forge Digital — Agency White-Label",
    stageSlug: "proposal",
    value: 12000,
    company: "Forge Digital",
    contact: "Marcus Webb",
    notes: "White-label Personize for their agency clients. Proposal for 10-seat annual license.",
  },
  {
    title: "Atlas Cloud — Infrastructure Partnership",
    stageSlug: "negotiation",
    value: 18000,
    company: "Atlas Cloud",
    contact: "Priya Sharma",
    notes: "Co-sell partnership — Personize bundled with Atlas managed hosting. Negotiating rev-share terms.",
  },
  {
    title: "Pinnacle Inc — Enterprise Pilot",
    stageSlug: "negotiation",
    value: 24000,
    company: "Pinnacle Inc",
    contact: "James Hartford",
    notes: "Enterprise pilot for sales team of 50. Negotiating SOW and data residency requirements.",
  },
  {
    title: "Cobalt Security — Threat Intel Memory",
    stageSlug: "lead",
    value: 6000,
    company: "Cobalt Security",
    contact: "Elena Vasquez",
    notes: "Inbound from LinkedIn — interested in persistent memory for threat intelligence workflows.",
  },
  {
    title: "Meridian Partners — VC Portfolio Tool",
    stageSlug: "closed-won",
    value: 3600,
    company: "Meridian Partners",
    contact: "Tom Nguyen",
    notes: "Signed! Annual license for portfolio company relationship tracking. Onboarding starts Monday.",
  },
  {
    title: "Stratos Energy — Lost to Competitor",
    stageSlug: "closed-lost",
    value: 15000,
    company: "Stratos Energy",
    contact: "David Park",
    notes: "Lost to incumbent CRM vendor who added basic memory features. Follow up in Q3 when contract renews.",
  },
];

// ---------------------------------------------------------------------------
// POST /api/admin/seed-pipeline
// ---------------------------------------------------------------------------

export const POST = withErrorHandler(async function POST(req: NextRequest) {
  const authError = authenticate(req);
  if (authError) return authError;

  const supabase = createServiceClient();
  const { userId, projectId } = await getSeedContext(supabase);

  if (!projectId) {
    return NextResponse.json(
      { error: "No project found. Run /api/admin/seed first to create projects." },
      { status: 400 },
    );
  }

  // --- Ensure pipeline exists ---
  const plId = pipelineId(PIPELINE_PREFIX, 1);
  const { error: plErr } = await supabase.from("pipelines").upsert(
    {
      id: plId,
      project_id: projectId,
      user_id: userId,
      name: "Personize Sales Pipeline",
      type: "sales",
      stage_order: STAGES.map((_, i) => pipelineId(STAGE_PREFIX, i + 1)),
    },
    { onConflict: "id" },
  );
  if (plErr) {
    return NextResponse.json(
      { error: `Pipeline upsert failed: ${plErr.message}` },
      { status: 500 },
    );
  }

  // --- Ensure stages exist ---
  const stageRows = STAGES.map((s, i) => ({
    id: pipelineId(STAGE_PREFIX, i + 1),
    pipeline_id: plId,
    project_id: projectId,
    user_id: userId,
    name: s.name,
    slug: s.slug,
    sort_order: s.sort_order,
    color: s.color,
  }));

  const { error: stErr } = await supabase
    .from("pipeline_stages")
    .upsert(stageRows, { onConflict: "id" });
  if (stErr) {
    return NextResponse.json(
      { error: `Stages upsert failed: ${stErr.message}` },
      { status: 500 },
    );
  }

  // Build slug → stage_id lookup
  const stageIdBySlug: Record<string, string> = {};
  for (let i = 0; i < STAGES.length; i++) {
    stageIdBySlug[STAGES[i].slug] = pipelineId(STAGE_PREFIX, i + 1);
  }

  // --- Upsert deals ---
  const dealRows = DEALS.map((d, i) => ({
    id: pipelineId(DEAL_PREFIX, i + 1),
    pipeline_id: plId,
    stage_id: stageIdBySlug[d.stageSlug],
    project_id: projectId,
    user_id: userId,
    title: d.title,
    entity_type: "deal",
    metadata: {
      value: d.value,
      currency: "USD",
      company: d.company,
      contact: d.contact,
      notes: d.notes,
    },
  }));

  const { error: dealErr } = await supabase
    .from("pipeline_items")
    .upsert(dealRows, { onConflict: "id" });
  if (dealErr) {
    return NextResponse.json(
      { error: `Deals upsert failed: ${dealErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    pipeline_id: plId,
    stages_seeded: stageRows.length,
    deals_seeded: dealRows.length,
    total_seeded: stageRows.length + dealRows.length,
  });
});
