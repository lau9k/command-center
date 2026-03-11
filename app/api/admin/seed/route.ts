import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

// ---------------------------------------------------------------------------
// Stable UUIDs for fixture data (deterministic so ON CONFLICT works)
// ---------------------------------------------------------------------------
const CONTACT_IDS = {
  hamed: "a0000000-0000-0000-0000-000000000001",
  mattLangie: "a0000000-0000-0000-0000-000000000002",
  julieBui: "a0000000-0000-0000-0000-000000000003",
  tiffanyMcIntyre: "a0000000-0000-0000-0000-000000000004",
  ray: "a0000000-0000-0000-0000-000000000005",
  faaris: "a0000000-0000-0000-0000-000000000006",
  mattCook: "a0000000-0000-0000-0000-000000000007",
  calumBird: "a0000000-0000-0000-0000-000000000008",
  patrickDean: "a0000000-0000-0000-0000-000000000009",
  grahamPayette: "a0000000-0000-0000-0000-00000000000a",
} as const;

const TASK_IDS = [
  "b0000000-0000-0000-0000-000000000001",
  "b0000000-0000-0000-0000-000000000002",
  "b0000000-0000-0000-0000-000000000003",
  "b0000000-0000-0000-0000-000000000004",
  "b0000000-0000-0000-0000-000000000005",
  "b0000000-0000-0000-0000-000000000006",
  "b0000000-0000-0000-0000-000000000007",
  "b0000000-0000-0000-0000-000000000008",
  "b0000000-0000-0000-0000-000000000009",
  "b0000000-0000-0000-0000-00000000000a",
  "b0000000-0000-0000-0000-00000000000b",
  "b0000000-0000-0000-0000-00000000000c",
  "b0000000-0000-0000-0000-00000000000d",
  "b0000000-0000-0000-0000-00000000000e",
  "b0000000-0000-0000-0000-00000000000f",
] as const;

const PIPELINE_ITEM_IDS = [
  "c0000000-0000-0000-0000-000000000001",
  "c0000000-0000-0000-0000-000000000002",
  "c0000000-0000-0000-0000-000000000003",
  "c0000000-0000-0000-0000-000000000004",
  "c0000000-0000-0000-0000-000000000005",
  "c0000000-0000-0000-0000-000000000006",
  "c0000000-0000-0000-0000-000000000007",
  "c0000000-0000-0000-0000-000000000008",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Relative date helper — returns ISO date string offset by `days` from today */
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type ProjectMap = Record<string, string>; // slug → id
type StageMap = Record<string, Record<string, string>>; // projectSlug → { stageSlug → stage_id }
type PipelineMap = Record<string, string>; // projectSlug → pipeline_id

// ---------------------------------------------------------------------------
// POST /api/admin/seed
// ---------------------------------------------------------------------------
export const POST = withErrorHandler(async function POST(req: NextRequest) {
  // ---- Auth: require SEED_SECRET header or query param ----
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

  const supabase = createServiceClient();

  // ---- 1. Look up existing projects by slug ----
  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("id, slug, user_id");

  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 500 });
  }

  const projectMap: ProjectMap = {};
  let seedUserId = "00000000-0000-0000-0000-000000000000";

  for (const p of projects ?? []) {
    projectMap[p.slug] = p.id;
    if (p.user_id && p.user_id !== "00000000-0000-0000-0000-000000000000") {
      seedUserId = p.user_id;
    }
  }

  // Ensure all required projects exist
  const requiredProjects = [
    { slug: "personize", name: "Personize", status: "active" },
    { slug: "meek", name: "MEEK", status: "active" },
    { slug: "hackathons", name: "Hackathons", status: "active" },
    { slug: "infrastructure", name: "Infrastructure", status: "active" },
    { slug: "eventium", name: "Eventium", status: "planned" },
  ];

  for (const rp of requiredProjects) {
    if (!projectMap[rp.slug]) {
      const { data: inserted, error: insErr } = await supabase
        .from("projects")
        .insert({ user_id: seedUserId, name: rp.name, slug: rp.slug, status: rp.status })
        .select("id")
        .single();

      if (insErr) {
        return NextResponse.json(
          { error: `Failed to create project ${rp.slug}: ${insErr.message}` },
          { status: 500 },
        );
      }
      projectMap[rp.slug] = inserted.id;
    }
  }

  // ---- 2. Ensure pipelines & stages exist (reuse 034_seed_pipeline logic) ----
  const { data: pipelines } = await supabase
    .from("pipelines")
    .select("id, project_id, type");

  const pipelineMap: PipelineMap = {};
  const projectIdToSlug: Record<string, string> = {};
  for (const [slug, id] of Object.entries(projectMap)) {
    projectIdToSlug[id] = slug;
  }
  for (const pl of pipelines ?? []) {
    const slug = projectIdToSlug[pl.project_id];
    if (slug && pl.type === "sales") {
      pipelineMap[slug] = pl.id;
    }
  }

  // Create missing sales pipelines
  for (const rp of requiredProjects) {
    if (!pipelineMap[rp.slug]) {
      const { data: pl, error: plErr } = await supabase
        .from("pipelines")
        .insert({
          project_id: projectMap[rp.slug],
          user_id: seedUserId,
          name: "Sales Pipeline",
          type: "sales",
          stage_order: [],
        })
        .select("id")
        .single();

      if (plErr) {
        return NextResponse.json(
          { error: `Failed to create pipeline for ${rp.slug}: ${plErr.message}` },
          { status: 500 },
        );
      }
      pipelineMap[rp.slug] = pl.id;
    }
  }

  // ---- 3. Ensure pipeline stages exist ----
  const defaultStages = [
    { name: "Lead", slug: "lead", sort_order: 0, color: "#3B82F6" },
    { name: "Contacted", slug: "contacted", sort_order: 1, color: "#A855F7" },
    { name: "Demo Scheduled", slug: "demo-scheduled", sort_order: 2, color: "#F97316" },
    { name: "Proposal Sent", slug: "proposal-sent", sort_order: 3, color: "#EAB308" },
    { name: "Negotiation", slug: "negotiation", sort_order: 4, color: "#F97316" },
    { name: "Won", slug: "won", sort_order: 5, color: "#22C55E" },
    { name: "Lost", slug: "lost", sort_order: 6, color: "#6B7280" },
  ];

  const { data: allStages } = await supabase
    .from("pipeline_stages")
    .select("id, pipeline_id, slug");

  const stageMap: StageMap = {};
  const pipelineIdToSlug: Record<string, string> = {};
  for (const [slug, plId] of Object.entries(pipelineMap)) {
    pipelineIdToSlug[plId] = slug;
  }

  for (const st of allStages ?? []) {
    const projSlug = pipelineIdToSlug[st.pipeline_id];
    if (projSlug) {
      stageMap[projSlug] ??= {};
      stageMap[projSlug][st.slug] = st.id;
    }
  }

  // Seed missing stages for each pipeline
  for (const rp of requiredProjects) {
    const plId = pipelineMap[rp.slug];
    if (!stageMap[rp.slug] || Object.keys(stageMap[rp.slug]).length === 0) {
      const rows = defaultStages.map((s) => ({
        pipeline_id: plId,
        project_id: projectMap[rp.slug],
        user_id: seedUserId,
        ...s,
      }));
      const { data: inserted } = await supabase
        .from("pipeline_stages")
        .upsert(rows, { onConflict: "id" })
        .select("id, slug");

      stageMap[rp.slug] = {};
      for (const s of inserted ?? []) {
        stageMap[rp.slug][s.slug] = s.id;
      }
    }
  }

  // Helper to resolve a stage id
  function stageId(projSlug: string, stageSlug: string): string {
    return stageMap[projSlug]?.[stageSlug] ?? "";
  }

  // ---- 4. Seed contacts ----
  const contacts = [
    { id: CONTACT_IDS.hamed, project_id: projectMap.personize, user_id: seedUserId, name: "Hamed", company: "Personize", source: "founder", qualified_status: "active" },
    { id: CONTACT_IDS.mattLangie, project_id: projectMap.personize, user_id: seedUserId, name: "Matt Langie", company: "Personize", source: "team", qualified_status: "active" },
    { id: CONTACT_IDS.julieBui, project_id: projectMap.hackathons, user_id: seedUserId, name: "Julie Bui", company: "CAIA", source: "board", qualified_status: "active" },
    { id: CONTACT_IDS.tiffanyMcIntyre, project_id: projectMap.hackathons, user_id: seedUserId, name: "Tiffany McIntyre", company: "CAIA", source: "board", qualified_status: "active" },
    { id: CONTACT_IDS.ray, project_id: projectMap.meek, user_id: seedUserId, name: "Ray", company: "MEEK", source: "investor", qualified_status: "active" },
    { id: CONTACT_IDS.faaris, project_id: projectMap.meek, user_id: seedUserId, name: "Faaris", company: "MEEK", source: "investor", qualified_status: "active" },
    { id: CONTACT_IDS.mattCook, project_id: projectMap.eventium, user_id: seedUserId, name: "Matt Cook", company: "Eventium", source: "partner", qualified_status: "active" },
    { id: CONTACT_IDS.calumBird, project_id: projectMap.hackathons, user_id: seedUserId, name: "Calum Bird", company: "Trelent", source: "sponsor", qualified_status: "lead" },
    { id: CONTACT_IDS.patrickDean, project_id: projectMap.hackathons, user_id: seedUserId, name: "Patrick Dean", company: "StarFish Medical", source: "sponsor", qualified_status: "lead" },
    { id: CONTACT_IDS.grahamPayette, project_id: projectMap.hackathons, user_id: seedUserId, name: "Graham Payette", company: "Island Health", source: "sponsor", qualified_status: "lead" },
  ];

  const { error: contactErr } = await supabase
    .from("contacts")
    .upsert(contacts, { onConflict: "id", ignoreDuplicates: true });

  if (contactErr) {
    return NextResponse.json(
      { error: `Contacts seed failed: ${contactErr.message}` },
      { status: 500 },
    );
  }

  // ---- 5. Seed tasks ----
  const tasks = [
    // Personize (5)
    { id: TASK_IDS[0], project_id: projectMap.personize, user_id: seedUserId, title: "SDK integration for analytics module", status: "in_progress", priority: "high", due_date: daysFromNow(3) },
    { id: TASK_IDS[1], project_id: projectMap.personize, user_id: seedUserId, title: "Email backfill — import historical contacts", status: "todo", priority: "medium", due_date: daysFromNow(7) },
    { id: TASK_IDS[2], project_id: projectMap.personize, user_id: seedUserId, title: "Plug and Play pitch prep", status: "done", priority: "critical", due_date: daysFromNow(-2) },
    { id: TASK_IDS[3], project_id: projectMap.personize, user_id: seedUserId, title: "Update demo deck for investor meeting", status: "in_progress", priority: "high", due_date: daysFromNow(1) },
    { id: TASK_IDS[4], project_id: projectMap.personize, user_id: seedUserId, title: "Content pipeline — schedule 4 LinkedIn posts", status: "todo", priority: "low", due_date: daysFromNow(14) },
    // Hackathons (4)
    { id: TASK_IDS[5], project_id: projectMap.hackathons, user_id: seedUserId, title: "Sponsor outreach — confirm Gold tier partners", status: "in_progress", priority: "high", due_date: daysFromNow(5) },
    { id: TASK_IDS[6], project_id: projectMap.hackathons, user_id: seedUserId, title: "BuilderVault rebrand — finalize new logo", status: "todo", priority: "medium", due_date: daysFromNow(10) },
    { id: TASK_IDS[7], project_id: projectMap.hackathons, user_id: seedUserId, title: "Venue confirmation for Spring hackathon", status: "done", priority: "critical", due_date: daysFromNow(-5) },
    { id: TASK_IDS[8], project_id: projectMap.hackathons, user_id: seedUserId, title: "Recruit 10 mentors for judging panel", status: "todo", priority: "medium", due_date: daysFromNow(12) },
    // MEEK (3)
    { id: TASK_IDS[9], project_id: projectMap.meek, user_id: seedUserId, title: "Community growth — hit 500 Discord members", status: "in_progress", priority: "medium", due_date: daysFromNow(20) },
    { id: TASK_IDS[10], project_id: projectMap.meek, user_id: seedUserId, title: "Faaris funds follow-up — wire confirmation", status: "todo", priority: "high", due_date: daysFromNow(-1) },
    { id: TASK_IDS[11], project_id: projectMap.meek, user_id: seedUserId, title: "Content calendar review for Q2", status: "done", priority: "low", due_date: daysFromNow(-7) },
    // Infrastructure (3)
    { id: TASK_IDS[12], project_id: projectMap.infrastructure, user_id: seedUserId, title: "Cyrus VPS monitoring — set up uptime checks", status: "todo", priority: "high", due_date: daysFromNow(2) },
    { id: TASK_IDS[13], project_id: projectMap.infrastructure, user_id: seedUserId, title: "Sentry alerts — configure error thresholds", status: "in_progress", priority: "medium", due_date: daysFromNow(4) },
    { id: TASK_IDS[14], project_id: projectMap.infrastructure, user_id: seedUserId, title: "Dashboard data seeding — populate fixture data", status: "in_progress", priority: "high", due_date: daysFromNow(0) },
  ];

  const { error: taskErr } = await supabase
    .from("tasks")
    .upsert(tasks, { onConflict: "id", ignoreDuplicates: true });

  if (taskErr) {
    return NextResponse.json(
      { error: `Tasks seed failed: ${taskErr.message}` },
      { status: 500 },
    );
  }

  // ---- 6. Seed pipeline items ----
  const pipelineItems = [
    // Personize — 3 deals
    {
      id: PIPELINE_ITEM_IDS[0],
      pipeline_id: pipelineMap.personize,
      stage_id: stageId("personize", "contacted"),
      project_id: projectMap.personize,
      user_id: seedUserId,
      title: "Personize — Enterprise Pilot",
      entity_type: "deal",
      metadata: { value: 50000, currency: "USD", company: "TechCorp" },
    },
    {
      id: PIPELINE_ITEM_IDS[1],
      pipeline_id: pipelineMap.personize,
      stage_id: stageId("personize", "proposal-sent"),
      project_id: projectMap.personize,
      user_id: seedUserId,
      title: "Personize — SMB Package",
      entity_type: "deal",
      metadata: { value: 15000, currency: "USD", company: "GrowthStartup" },
    },
    {
      id: PIPELINE_ITEM_IDS[2],
      pipeline_id: pipelineMap.personize,
      stage_id: stageId("personize", "negotiation"),
      project_id: projectMap.personize,
      user_id: seedUserId,
      title: "Personize — Agency Reseller",
      entity_type: "deal",
      metadata: { value: 5000, currency: "USD", company: "MarketingPros" },
    },
    // Hackathons — 3 sponsor deals
    {
      id: PIPELINE_ITEM_IDS[3],
      pipeline_id: pipelineMap.hackathons,
      stage_id: stageId("hackathons", "lead"),
      project_id: projectMap.hackathons,
      user_id: seedUserId,
      title: "Hackathon — Gold Sponsor (Trelent)",
      entity_type: "deal",
      metadata: { value: 25000, currency: "USD", company: "Trelent" },
    },
    {
      id: PIPELINE_ITEM_IDS[4],
      pipeline_id: pipelineMap.hackathons,
      stage_id: stageId("hackathons", "contacted"),
      project_id: projectMap.hackathons,
      user_id: seedUserId,
      title: "Hackathon — Silver Sponsor (StarFish Medical)",
      entity_type: "deal",
      metadata: { value: 10000, currency: "USD", company: "StarFish Medical" },
    },
    {
      id: PIPELINE_ITEM_IDS[5],
      pipeline_id: pipelineMap.hackathons,
      stage_id: stageId("hackathons", "lead"),
      project_id: projectMap.hackathons,
      user_id: seedUserId,
      title: "Hackathon — Community Sponsor (Island Health)",
      entity_type: "deal",
      metadata: { value: 1000, currency: "USD", company: "Island Health" },
    },
    // Eventium — 2 deals
    {
      id: PIPELINE_ITEM_IDS[6],
      pipeline_id: pipelineMap.eventium,
      stage_id: stageId("eventium", "lead"),
      project_id: projectMap.eventium,
      user_id: seedUserId,
      title: "Eventium — Platform License (VenueX)",
      entity_type: "deal",
      metadata: { value: 50000, currency: "USD", company: "VenueX" },
    },
    {
      id: PIPELINE_ITEM_IDS[7],
      pipeline_id: pipelineMap.eventium,
      stage_id: stageId("eventium", "lead"),
      project_id: projectMap.eventium,
      user_id: seedUserId,
      title: "Eventium — White-Label Deal (ConferencePro)",
      entity_type: "deal",
      metadata: { value: 10000, currency: "USD", company: "ConferencePro" },
    },
  ];

  const { error: pipeErr } = await supabase
    .from("pipeline_items")
    .upsert(pipelineItems, { onConflict: "id", ignoreDuplicates: true });

  if (pipeErr) {
    return NextResponse.json(
      { error: `Pipeline items seed failed: ${pipeErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    projects: requiredProjects.length,
    contacts: contacts.length,
    tasks: tasks.length,
    pipeline_items: pipelineItems.length,
  });
});
