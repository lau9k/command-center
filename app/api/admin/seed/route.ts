import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------
const seedModuleEnum = z.enum(["all", "contacts", "tasks", "projects", "sponsors"]);

const seedRequestSchema = z.object({
  module: seedModuleEnum.default("all"),
  count: z.number().int().min(1).max(100).default(10),
});

const clearRequestSchema = z.object({
  module: z.enum(["contacts", "tasks", "projects", "sponsors"]),
});

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

const SPONSOR_IDS = [
  "d0000000-0000-0000-0000-000000000001",
  "d0000000-0000-0000-0000-000000000002",
  "d0000000-0000-0000-0000-000000000003",
  "d0000000-0000-0000-0000-000000000004",
  "d0000000-0000-0000-0000-000000000005",
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

type SeedModule = "all" | "contacts" | "tasks" | "projects" | "sponsors";
type ProjectMap = Record<string, string>; // slug → id
type StageMap = Record<string, Record<string, string>>; // projectSlug → { stageSlug → stage_id }
type PipelineMap = Record<string, string>; // projectSlug → pipeline_id

/** Generate N deterministic UUIDs from a base prefix */
function generateIds(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const hex = (i + 1).toString(16).padStart(12, "0");
    return `${prefix}-0000-0000-0000-${hex}`;
  });
}

/** Names pool for generating extra contacts */
const EXTRA_FIRST_NAMES = [
  "Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Quinn",
  "Avery", "Jamie", "Drew", "Blake", "Reese", "Parker", "Hayden", "Emery",
  "Rowan", "Sage", "Finley", "Dakota", "River", "Phoenix", "Eden", "Blair",
  "Cameron", "Skyler", "Kendall", "Lennox", "Harper", "Marlowe", "Ellis",
  "Rory", "Jules", "Wren", "Arden", "Shiloh", "Oakley", "Sutton", "Milan",
  "Briar", "Haven", "Sterling", "Kai", "Sloane", "Tatum", "Lane", "Teagan",
  "Frankie", "Remington", "Harlow",
];

const EXTRA_COMPANIES = [
  "Acme Corp", "Zenith Labs", "Apex Dynamics", "Nova Systems", "Pulse Tech",
  "Vortex AI", "Helix Data", "Prism Analytics", "Forge Digital", "Atlas Cloud",
  "Summit Partners", "Horizon Ventures", "Catalyst Group", "Pinnacle Inc",
  "Vector Solutions", "Orbit Media", "Nexus Health", "Stratos Energy",
  "Cobalt Security", "Ember Design",
];

const TASK_TITLES = [
  "Review quarterly metrics report",
  "Update onboarding documentation",
  "Fix broken CI pipeline",
  "Prepare investor update deck",
  "Conduct user interview sessions",
  "Optimize database query performance",
  "Design new landing page mockup",
  "Set up monitoring alerts",
  "Write integration test suite",
  "Plan team offsite agenda",
  "Audit security permissions",
  "Create API documentation",
  "Implement webhook notifications",
  "Research competitor pricing",
  "Configure staging environment",
  "Draft partnership proposal",
  "Update privacy policy page",
  "Benchmark load testing results",
  "Organize knowledge base articles",
  "Schedule stakeholder demo",
  "Migrate legacy data format",
  "Build analytics dashboard widget",
  "Review pull request backlog",
  "Set up automated deployments",
  "Create customer success playbook",
  "Update dependency versions",
  "Design email template system",
  "Plan sprint retrospective",
  "Configure log aggregation",
  "Write release notes",
  "Implement rate limiting",
  "Create onboarding checklist",
  "Optimize image compression pipeline",
  "Draft blog post outline",
  "Set up error tracking alerts",
  "Review access control policies",
  "Plan feature flag rollout",
  "Build CSV export functionality",
  "Conduct performance review prep",
  "Update billing integration",
  "Design notification preferences UI",
  "Create data backup strategy",
  "Audit third-party integrations",
  "Implement search functionality",
  "Write API changelog entries",
  "Plan capacity scaling strategy",
  "Build admin reporting tools",
  "Review customer feedback themes",
  "Configure CDN caching rules",
  "Create incident response runbook",
];

const SPONSOR_NAMES = [
  "TechForward Inc", "DataStream Labs", "CloudBridge Solutions",
  "Quantum Leap Ventures", "GreenField Capital", "BlueWave Technologies",
  "Ironclad Security", "SkyPeak Analytics", "NexGen Robotics",
  "CrystalClear AI", "Meridian Partners", "Elevate Digital",
  "Titan Infrastructure", "BrightPath Systems", "CrestLine Corp",
];

// ---------------------------------------------------------------------------
// Auth helper
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
// Setup helpers — ensure projects, pipelines, and stages exist
// ---------------------------------------------------------------------------

const REQUIRED_PROJECTS = [
  { slug: "personize", name: "Personize", status: "active" },
  { slug: "meek", name: "MEEK", status: "active" },
  { slug: "hackathons", name: "Hackathons", status: "active" },
  { slug: "infrastructure", name: "Infrastructure", status: "active" },
  { slug: "eventium", name: "Eventium", status: "planned" },
];

const DEFAULT_STAGES = [
  { name: "Lead", slug: "lead", sort_order: 0, color: "#3B82F6" },
  { name: "Contacted", slug: "contacted", sort_order: 1, color: "#A855F7" },
  { name: "Demo Scheduled", slug: "demo-scheduled", sort_order: 2, color: "#F97316" },
  { name: "Proposal Sent", slug: "proposal-sent", sort_order: 3, color: "#EAB308" },
  { name: "Negotiation", slug: "negotiation", sort_order: 4, color: "#F97316" },
  { name: "Won", slug: "won", sort_order: 5, color: "#22C55E" },
  { name: "Lost", slug: "lost", sort_order: 6, color: "#6B7280" },
];

interface SetupResult {
  projectMap: ProjectMap;
  pipelineMap: PipelineMap;
  stageMap: StageMap;
  seedUserId: string;
  error?: NextResponse;
}

async function ensureProjectInfra(
  supabase: ReturnType<typeof createServiceClient>,
): Promise<SetupResult> {
  // Look up existing projects
  const { data: projects, error: projErr } = await supabase
    .from("projects")
    .select("id, slug, user_id");

  if (projErr) {
    return {
      projectMap: {},
      pipelineMap: {},
      stageMap: {},
      seedUserId: "",
      error: NextResponse.json({ error: projErr.message }, { status: 500 }),
    };
  }

  const projectMap: ProjectMap = {};
  let seedUserId = "00000000-0000-0000-0000-000000000000";

  for (const p of projects ?? []) {
    projectMap[p.slug] = p.id;
    if (p.user_id && p.user_id !== "00000000-0000-0000-0000-000000000000") {
      seedUserId = p.user_id;
    }
  }

  // Ensure required projects exist
  for (const rp of REQUIRED_PROJECTS) {
    if (!projectMap[rp.slug]) {
      const { data: inserted, error: insErr } = await supabase
        .from("projects")
        .insert({ user_id: seedUserId, name: rp.name, slug: rp.slug, status: rp.status })
        .select("id")
        .single();

      if (insErr) {
        return {
          projectMap,
          pipelineMap: {},
          stageMap: {},
          seedUserId,
          error: NextResponse.json(
            { error: `Failed to create project ${rp.slug}: ${insErr.message}` },
            { status: 500 },
          ),
        };
      }
      projectMap[rp.slug] = inserted.id;
    }
  }

  // Ensure pipelines exist
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

  for (const rp of REQUIRED_PROJECTS) {
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
        return {
          projectMap,
          pipelineMap,
          stageMap: {},
          seedUserId,
          error: NextResponse.json(
            { error: `Failed to create pipeline for ${rp.slug}: ${plErr.message}` },
            { status: 500 },
          ),
        };
      }
      pipelineMap[rp.slug] = pl.id;
    }
  }

  // Ensure pipeline stages exist
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

  for (const rp of REQUIRED_PROJECTS) {
    const plId = pipelineMap[rp.slug];
    if (!stageMap[rp.slug] || Object.keys(stageMap[rp.slug]).length === 0) {
      const rows = DEFAULT_STAGES.map((s) => ({
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

  return { projectMap, pipelineMap, stageMap, seedUserId };
}

// ---------------------------------------------------------------------------
// Module seeders
// ---------------------------------------------------------------------------

async function seedContacts(
  supabase: ReturnType<typeof createServiceClient>,
  projectMap: ProjectMap,
  seedUserId: string,
  count: number,
): Promise<{ seeded: number; error?: string }> {
  const baseContacts: Array<{
    id: string;
    project_id: string;
    user_id: string;
    name: string;
    company: string;
    source: string;
    qualified_status: string;
  }> = [
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

  // Take up to `count` base contacts, then fill with generated ones
  const contacts = baseContacts.slice(0, count);
  const projectSlugs = Object.keys(projectMap);
  const sources = ["manual", "referral", "website", "linkedin", "other"];
  const statuses = ["active", "lead"];

  if (count > baseContacts.length) {
    const extraIds = generateIds("a1000000", count - baseContacts.length);
    for (let i = 0; i < extraIds.length; i++) {
      const firstName = EXTRA_FIRST_NAMES[i % EXTRA_FIRST_NAMES.length];
      const company = EXTRA_COMPANIES[i % EXTRA_COMPANIES.length];
      const projSlug = projectSlugs[i % projectSlugs.length];
      contacts.push({
        id: extraIds[i],
        project_id: projectMap[projSlug],
        user_id: seedUserId,
        name: `${firstName} ${company.split(" ")[0]}`,
        company,
        source: sources[i % sources.length],
        qualified_status: statuses[i % statuses.length],
      });
    }
  }

  const { error } = await supabase
    .from("contacts")
    .upsert(contacts, { onConflict: "id", ignoreDuplicates: true });

  if (error) return { seeded: 0, error: `Contacts seed failed: ${error.message}` };
  return { seeded: contacts.length };
}

async function seedTasks(
  supabase: ReturnType<typeof createServiceClient>,
  projectMap: ProjectMap,
  seedUserId: string,
  count: number,
): Promise<{ seeded: number; error?: string }> {
  const baseTasks: Array<{
    id: string;
    project_id: string;
    user_id: string;
    title: string;
    status: string;
    priority: string;
    due_date: string;
  }> = [
    { id: TASK_IDS[0], project_id: projectMap.personize, user_id: seedUserId, title: "SDK integration for analytics module", status: "in_progress", priority: "high", due_date: daysFromNow(3) },
    { id: TASK_IDS[1], project_id: projectMap.personize, user_id: seedUserId, title: "Email backfill — import historical contacts", status: "todo", priority: "medium", due_date: daysFromNow(7) },
    { id: TASK_IDS[2], project_id: projectMap.personize, user_id: seedUserId, title: "Plug and Play pitch prep", status: "done", priority: "critical", due_date: daysFromNow(-2) },
    { id: TASK_IDS[3], project_id: projectMap.personize, user_id: seedUserId, title: "Update demo deck for investor meeting", status: "in_progress", priority: "high", due_date: daysFromNow(1) },
    { id: TASK_IDS[4], project_id: projectMap.personize, user_id: seedUserId, title: "Content pipeline — schedule 4 LinkedIn posts", status: "todo", priority: "low", due_date: daysFromNow(14) },
    { id: TASK_IDS[5], project_id: projectMap.hackathons, user_id: seedUserId, title: "Sponsor outreach — confirm Gold tier partners", status: "in_progress", priority: "high", due_date: daysFromNow(5) },
    { id: TASK_IDS[6], project_id: projectMap.hackathons, user_id: seedUserId, title: "BuilderVault rebrand — finalize new logo", status: "todo", priority: "medium", due_date: daysFromNow(10) },
    { id: TASK_IDS[7], project_id: projectMap.hackathons, user_id: seedUserId, title: "Venue confirmation for Spring hackathon", status: "done", priority: "critical", due_date: daysFromNow(-5) },
    { id: TASK_IDS[8], project_id: projectMap.hackathons, user_id: seedUserId, title: "Recruit 10 mentors for judging panel", status: "todo", priority: "medium", due_date: daysFromNow(12) },
    { id: TASK_IDS[9], project_id: projectMap.meek, user_id: seedUserId, title: "Community growth — hit 500 Discord members", status: "in_progress", priority: "medium", due_date: daysFromNow(20) },
    { id: TASK_IDS[10], project_id: projectMap.meek, user_id: seedUserId, title: "Faaris funds follow-up — wire confirmation", status: "todo", priority: "high", due_date: daysFromNow(-1) },
    { id: TASK_IDS[11], project_id: projectMap.meek, user_id: seedUserId, title: "Content calendar review for Q2", status: "done", priority: "low", due_date: daysFromNow(-7) },
    { id: TASK_IDS[12], project_id: projectMap.infrastructure, user_id: seedUserId, title: "Cyrus VPS monitoring — set up uptime checks", status: "todo", priority: "high", due_date: daysFromNow(2) },
    { id: TASK_IDS[13], project_id: projectMap.infrastructure, user_id: seedUserId, title: "Sentry alerts — configure error thresholds", status: "in_progress", priority: "medium", due_date: daysFromNow(4) },
    { id: TASK_IDS[14], project_id: projectMap.infrastructure, user_id: seedUserId, title: "Dashboard data seeding — populate fixture data", status: "in_progress", priority: "high", due_date: daysFromNow(0) },
  ];

  const tasks = baseTasks.slice(0, count);
  const projectSlugs = Object.keys(projectMap);
  const statusOptions = ["todo", "in_progress", "done", "blocked"];
  const priorityOptions = ["critical", "high", "medium", "low"];

  if (count > baseTasks.length) {
    const extraIds = generateIds("b1000000", count - baseTasks.length);
    for (let i = 0; i < extraIds.length; i++) {
      const projSlug = projectSlugs[i % projectSlugs.length];
      tasks.push({
        id: extraIds[i],
        project_id: projectMap[projSlug],
        user_id: seedUserId,
        title: TASK_TITLES[i % TASK_TITLES.length],
        status: statusOptions[i % statusOptions.length],
        priority: priorityOptions[i % priorityOptions.length],
        due_date: daysFromNow((i % 30) - 5),
      });
    }
  }

  const { error } = await supabase
    .from("tasks")
    .upsert(tasks, { onConflict: "id", ignoreDuplicates: true });

  if (error) return { seeded: 0, error: `Tasks seed failed: ${error.message}` };
  return { seeded: tasks.length };
}

async function seedProjects(
  supabase: ReturnType<typeof createServiceClient>,
  projectMap: ProjectMap,
  pipelineMap: PipelineMap,
  stageMap: StageMap,
  seedUserId: string,
  count: number,
): Promise<{ seeded: number; error?: string }> {
  function stageId(projSlug: string, stageSlug: string): string {
    return stageMap[projSlug]?.[stageSlug] ?? "";
  }

  const basePipelineItems: Array<{
    id: string;
    pipeline_id: string;
    stage_id: string;
    project_id: string;
    user_id: string;
    title: string;
    entity_type: string;
    metadata: { value: number; currency: string; company: string };
  }> = [
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

  const items = basePipelineItems.slice(0, count);

  const { error } = await supabase
    .from("pipeline_items")
    .upsert(items, { onConflict: "id", ignoreDuplicates: true });

  if (error) return { seeded: 0, error: `Pipeline items seed failed: ${error.message}` };
  return { seeded: REQUIRED_PROJECTS.length + items.length };
}

async function seedSponsors(
  supabase: ReturnType<typeof createServiceClient>,
  seedUserId: string,
  count: number,
): Promise<{ seeded: number; error?: string }> {
  // Find or create a default event for sponsors
  const { data: events } = await supabase
    .from("events")
    .select("id")
    .limit(1);

  let eventId: string | null = null;
  if (events && events.length > 0) {
    eventId = events[0].id;
  } else {
    const { data: newEvent, error: evErr } = await supabase
      .from("events")
      .insert({
        user_id: seedUserId,
        name: "Spring Hackathon 2026",
        date: daysFromNow(30),
        location: "Victoria, BC",
        status: "planning",
        budget_target: 50000,
        participant_target: 200,
      })
      .select("id")
      .single();

    if (evErr) return { seeded: 0, error: `Event creation failed: ${evErr.message}` };
    eventId = newEvent.id;
  }

  const tiers: Array<"bronze" | "silver" | "gold" | "platinum" | "title"> = [
    "gold", "silver", "bronze", "platinum", "title",
  ];
  const sponsorStatuses: Array<"not_contacted" | "contacted" | "negotiating" | "confirmed" | "declined"> = [
    "confirmed", "negotiating", "contacted", "confirmed", "not_contacted",
  ];
  const amounts = [25000, 10000, 5000, 50000, 1000];

  const sponsors: Array<{
    id: string;
    user_id: string;
    name: string;
    contact_name: string;
    contact_email: string;
    tier: "bronze" | "silver" | "gold" | "platinum" | "title";
    status: "not_contacted" | "contacted" | "negotiating" | "confirmed" | "declined";
    amount: number;
    currency: string;
    outreach_status: "sent";
    event_id: string | null;
  }> = Array.from({ length: Math.min(count, SPONSOR_IDS.length) }, (_, i) => ({
    id: SPONSOR_IDS[i],
    user_id: seedUserId,
    name: SPONSOR_NAMES[i % SPONSOR_NAMES.length],
    contact_name: EXTRA_FIRST_NAMES[i % EXTRA_FIRST_NAMES.length],
    contact_email: `sponsor${i + 1}@example.com`,
    tier: tiers[i % tiers.length],
    status: sponsorStatuses[i % sponsorStatuses.length],
    amount: amounts[i % amounts.length],
    currency: "USD",
    outreach_status: "sent" as const,
    event_id: eventId,
  }));

  // Add extra sponsors beyond the stable IDs
  if (count > SPONSOR_IDS.length) {
    const extraIds = generateIds("d1000000", count - SPONSOR_IDS.length);
    for (let i = 0; i < extraIds.length; i++) {
      const idx = SPONSOR_IDS.length + i;
      sponsors.push({
        id: extraIds[i],
        user_id: seedUserId,
        name: SPONSOR_NAMES[idx % SPONSOR_NAMES.length],
        contact_name: EXTRA_FIRST_NAMES[idx % EXTRA_FIRST_NAMES.length],
        contact_email: `sponsor${idx + 1}@example.com`,
        tier: tiers[idx % tiers.length],
        status: sponsorStatuses[idx % sponsorStatuses.length],
        amount: amounts[idx % amounts.length],
        currency: "USD",
        outreach_status: "sent" as const,
        event_id: eventId,
      });
    }
  }

  const { error } = await supabase
    .from("sponsors")
    .upsert(sponsors, { onConflict: "id", ignoreDuplicates: true });

  if (error) return { seeded: 0, error: `Sponsors seed failed: ${error.message}` };
  return { seeded: sponsors.length };
}

// ---------------------------------------------------------------------------
// POST /api/admin/seed
// ---------------------------------------------------------------------------
export const POST = withErrorHandler(async function POST(req: NextRequest) {
  const authError = authenticate(req);
  if (authError) return authError;

  // Parse + validate request body
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // No body — defaults will apply via Zod
  }

  const parsed = seedRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { module, count } = parsed.data;

  const supabase = createServiceClient();

  // Always ensure project infrastructure exists
  const setup = await ensureProjectInfra(supabase);
  if (setup.error) return setup.error;

  const { projectMap, pipelineMap, stageMap, seedUserId } = setup;

  const results: Record<string, { seeded: number; error?: string }> = {};

  // Seed requested modules
  if (module === "all" || module === "contacts") {
    results.contacts = await seedContacts(supabase, projectMap, seedUserId, count);
    if (results.contacts.error) {
      return NextResponse.json({ error: results.contacts.error }, { status: 500 });
    }
  }

  if (module === "all" || module === "tasks") {
    results.tasks = await seedTasks(supabase, projectMap, seedUserId, count);
    if (results.tasks.error) {
      return NextResponse.json({ error: results.tasks.error }, { status: 500 });
    }
  }

  if (module === "all" || module === "projects") {
    results.projects = await seedProjects(supabase, projectMap, pipelineMap, stageMap, seedUserId, count);
    if (results.projects.error) {
      return NextResponse.json({ error: results.projects.error }, { status: 500 });
    }
  }

  if (module === "all" || module === "sponsors") {
    results.sponsors = await seedSponsors(supabase, seedUserId, count);
    if (results.sponsors.error) {
      return NextResponse.json({ error: results.sponsors.error }, { status: 500 });
    }
  }

  const totalSeeded = Object.values(results).reduce((sum, r) => sum + r.seeded, 0);

  return NextResponse.json({
    success: true,
    module,
    count,
    total_seeded: totalSeeded,
    details: results,
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/admin/seed — clear all records from a specific module table
// ---------------------------------------------------------------------------

const MODULE_TABLES: Record<string, string> = {
  contacts: "contacts",
  tasks: "tasks",
  projects: "pipeline_items",
  sponsors: "sponsors",
};

export const DELETE = withErrorHandler(async function DELETE(req: NextRequest) {
  const authError = authenticate(req);
  if (authError) return authError;

  const body = await req.json();
  const parsed = clearRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { module } = parsed.data;
  const table = MODULE_TABLES[module];
  const supabase = createServiceClient();

  // Count before delete
  const { count: beforeCount } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    return NextResponse.json({ error: `Failed to clear ${module}: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    module,
    deleted: beforeCount ?? 0,
  });
});
