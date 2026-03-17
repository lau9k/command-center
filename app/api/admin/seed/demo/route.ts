import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { withErrorHandler } from "@/lib/api-error-handler"

// ---------------------------------------------------------------------------
// Stable UUIDs — prefixed with "de" for demo data
// ---------------------------------------------------------------------------

function demoId(prefix: string, index: number): string {
  const hex = index.toString(16).padStart(12, "0")
  return `de${prefix}00-0000-0000-0000-${hex}`
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Demo data definitions
// ---------------------------------------------------------------------------

const PROJECT_DEFS = [
  { slug: "acme-rebrand", name: "Acme Rebrand", status: "active" as const },
  { slug: "mobile-app-v2", name: "Mobile App v2", status: "active" as const },
  { slug: "q2-marketing", name: "Q2 Marketing Push", status: "active" as const },
  { slug: "developer-conf", name: "Developer Conference", status: "active" as const },
  { slug: "internal-tools", name: "Internal Tools", status: "active" as const },
]

const CONTACT_DEFS = [
  { name: "Sarah Chen", company: "Acme Corp", email: "sarah.chen@demo-acme.example", source: "linkedin" as const, status: "active" as const },
  { name: "Marcus Rivera", company: "TechForge", email: "m.rivera@demo-techforge.example", source: "referral" as const, status: "active" as const },
  { name: "Priya Sharma", company: "Apex Digital", email: "priya@demo-apex.example", source: "website" as const, status: "lead" as const },
  { name: "David Kim", company: "CloudBridge", email: "d.kim@demo-cloudbridge.example", source: "manual" as const, status: "active" as const },
  { name: "Emma Johansson", company: "Nordic Solutions", email: "emma.j@demo-nordic.example", source: "linkedin" as const, status: "customer" as const },
  { name: "Amir Hassan", company: "DataPulse", email: "amir@demo-datapulse.example", source: "referral" as const, status: "lead" as const },
  { name: "Lisa Park", company: "Zenith Labs", email: "l.park@demo-zenith.example", source: "website" as const, status: "active" as const },
  { name: "James O'Brien", company: "Forge Digital", email: "james.ob@demo-forge.example", source: "other" as const, status: "active" as const },
  { name: "Sofia Reyes", company: "Catalyst Group", email: "s.reyes@demo-catalyst.example", source: "linkedin" as const, status: "lead" as const },
  { name: "Thomas Nguyen", company: "Pinnacle Inc", email: "t.nguyen@demo-pinnacle.example", source: "manual" as const, status: "customer" as const },
]

const TASK_DEFS = [
  { title: "Finalize brand guidelines document", status: "in_progress" as const, priority: "high" as const, dueOffset: 3 },
  { title: "Review mobile app wireframes", status: "todo" as const, priority: "high" as const, dueOffset: 5 },
  { title: "Set up analytics tracking", status: "done" as const, priority: "medium" as const, dueOffset: -2 },
  { title: "Draft press release for product launch", status: "todo" as const, priority: "medium" as const, dueOffset: 10 },
  { title: "Coordinate speaker lineup", status: "in_progress" as const, priority: "critical" as const, dueOffset: 7 },
  { title: "Update API documentation", status: "todo" as const, priority: "low" as const, dueOffset: 14 },
  { title: "Design email campaign templates", status: "in_progress" as const, priority: "medium" as const, dueOffset: 4 },
  { title: "Conduct user testing sessions", status: "blocked" as const, priority: "high" as const, dueOffset: 6 },
  { title: "Prepare quarterly board presentation", status: "todo" as const, priority: "critical" as const, dueOffset: 12 },
  { title: "Optimize landing page load time", status: "done" as const, priority: "medium" as const, dueOffset: -5 },
  { title: "Migrate staging database", status: "in_progress" as const, priority: "high" as const, dueOffset: 2 },
  { title: "Create onboarding tutorial videos", status: "todo" as const, priority: "low" as const, dueOffset: 20 },
  { title: "Audit third-party integrations", status: "todo" as const, priority: "medium" as const, dueOffset: 8 },
  { title: "Schedule social media calendar", status: "done" as const, priority: "low" as const, dueOffset: -3 },
  { title: "Negotiate venue contract", status: "in_progress" as const, priority: "high" as const, dueOffset: 1 },
]

const DEAL_DEFS = [
  { title: "Acme Corp — Enterprise License", value: 75000, company: "Acme Corp", stage: "proposal-sent" },
  { title: "TechForge — Platform Integration", value: 30000, company: "TechForge", stage: "contacted" },
  { title: "Nordic Solutions — Annual Contract", value: 45000, company: "Nordic Solutions", stage: "negotiation" },
  { title: "CloudBridge — Pilot Program", value: 12000, company: "CloudBridge", stage: "lead" },
  { title: "Zenith Labs — Custom Development", value: 60000, company: "Zenith Labs", stage: "demo-scheduled" },
]

const CONTENT_DEFS = [
  { body: "Excited to announce our new product line launching next month! Stay tuned for early access.", platform: "linkedin" as const, status: "published" as const, brand: "personize" as const, dueOffset: -5 },
  { body: "Behind the scenes: How our team shipped v2 in record time. Thread below.", platform: "twitter" as const, status: "published" as const, brand: "personize" as const, dueOffset: -3 },
  { body: "Join us for a live demo this Friday at 2pm PST. Link in bio.", platform: "instagram" as const, status: "scheduled" as const, brand: "meek" as const, dueOffset: 2 },
  { body: "5 lessons we learned scaling from 100 to 10,000 users. A thread.", platform: "twitter" as const, status: "draft" as const, brand: "personize" as const, dueOffset: 7 },
  { body: "We're hiring! Looking for a senior full-stack engineer to join our remote team.", platform: "linkedin" as const, status: "scheduled" as const, brand: "personize" as const, dueOffset: 4 },
  { body: "Community spotlight: Featuring three amazing projects built with our API.", platform: "twitter" as const, status: "draft" as const, brand: "buildervault" as const, dueOffset: 10 },
  { body: "New blog post: The future of AI-powered productivity tools.", platform: "linkedin" as const, status: "ready" as const, brand: "personize" as const, dueOffset: 1 },
  { body: "Quick tip: Use keyboard shortcuts to navigate 3x faster in our app.", platform: "twitter" as const, status: "published" as const, brand: "meek" as const, dueOffset: -7 },
]

const SPONSOR_DEFS = [
  { name: "Cascade Ventures", contact: "Elena Marchetti", tier: "gold" as const, status: "confirmed" as const, amount: 25000 },
  { name: "Horizon Analytics", contact: "Derek Owens", tier: "silver" as const, status: "negotiating" as const, amount: 10000 },
  { name: "Vertex Technologies", contact: "Nina Patel", tier: "platinum" as const, status: "confirmed" as const, amount: 50000 },
]

const TRANSACTION_DEFS = [
  { name: "Office lease", amount: 3200, type: "expense" as const, category: "rent", interval: "monthly" as const, dueDay: 1 },
  { name: "SaaS subscriptions", amount: 450, type: "expense" as const, category: "software", interval: "monthly" as const, dueDay: 15 },
  { name: "Freelance design work", amount: 2500, type: "income" as const, category: "services", interval: "one_time" as const, dueDay: null },
  { name: "Cloud hosting", amount: 180, type: "expense" as const, category: "infrastructure", interval: "monthly" as const, dueDay: 5 },
  { name: "Client retainer — Acme", amount: 8000, type: "income" as const, category: "retainer", interval: "monthly" as const, dueDay: 1 },
  { name: "Marketing ad spend", amount: 1200, type: "expense" as const, category: "marketing", interval: "monthly" as const, dueDay: 10 },
  { name: "Conference ticket sales", amount: 15000, type: "income" as const, category: "events", interval: "one_time" as const, dueDay: null },
  { name: "Insurance premium", amount: 350, type: "expense" as const, category: "insurance", interval: "monthly" as const, dueDay: 20 },
  { name: "Consulting engagement", amount: 5000, type: "income" as const, category: "consulting", interval: "one_time" as const, dueDay: null },
  { name: "Team lunch stipend", amount: 200, type: "expense" as const, category: "perks", interval: "monthly" as const, dueDay: 25 },
]

const DEFAULT_STAGES = [
  { name: "Lead", slug: "lead", sort_order: 0, color: "#3B82F6" },
  { name: "Contacted", slug: "contacted", sort_order: 1, color: "#A855F7" },
  { name: "Demo Scheduled", slug: "demo-scheduled", sort_order: 2, color: "#F97316" },
  { name: "Proposal Sent", slug: "proposal-sent", sort_order: 3, color: "#EAB308" },
  { name: "Negotiation", slug: "negotiation", sort_order: 4, color: "#F97316" },
  { name: "Won", slug: "won", sort_order: 5, color: "#22C55E" },
  { name: "Lost", slug: "lost", sort_order: 6, color: "#6B7280" },
]

// ---------------------------------------------------------------------------
// POST /api/admin/seed/demo
// ---------------------------------------------------------------------------

export const POST = withErrorHandler(async function POST(req: NextRequest) {
  // Auth — same mechanism as the main seed route
  const secret = process.env.SEED_SECRET
  if (!secret) {
    return NextResponse.json({ error: "SEED_SECRET env var is not configured" }, { status: 500 })
  }

  const provided =
    req.headers.get("x-seed-secret") ?? req.nextUrl.searchParams.get("secret")
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Resolve seed user — grab from existing projects or fallback
  const { data: existingProjects } = await supabase.from("projects").select("user_id").limit(1)
  const seedUserId =
    existingProjects?.[0]?.user_id ?? "00000000-0000-0000-0000-000000000000"

  // --- 1. Projects (5) ---
  const projectMap: Record<string, string> = {}
  for (let i = 0; i < PROJECT_DEFS.length; i++) {
    const def = PROJECT_DEFS[i]
    const id = demoId("aa", i + 1)
    const { error } = await supabase.from("projects").upsert(
      { id, user_id: seedUserId, name: def.name, slug: def.slug, status: def.status },
      { onConflict: "id" },
    )
    if (error) return NextResponse.json({ error: `Project seed failed: ${error.message}` }, { status: 500 })
    projectMap[def.slug] = id
  }

  // --- 2. Contacts (10) ---
  const contacts = CONTACT_DEFS.map((def, i) => {
    const projectSlugs = Object.keys(projectMap)
    return {
      id: demoId("bb", i + 1),
      user_id: seedUserId,
      project_id: projectMap[projectSlugs[i % projectSlugs.length]],
      name: def.name,
      email: def.email,
      company: def.company,
      source: def.source,
      qualified_status: def.status,
    }
  })

  const { error: contactErr } = await supabase
    .from("contacts")
    .upsert(contacts, { onConflict: "id", ignoreDuplicates: true })
  if (contactErr) return NextResponse.json({ error: `Contacts seed failed: ${contactErr.message}` }, { status: 500 })

  // --- 3. Tasks (15) ---
  const tasks = TASK_DEFS.map((def, i) => {
    const projectSlugs = Object.keys(projectMap)
    return {
      id: demoId("cc", i + 1),
      user_id: seedUserId,
      project_id: projectMap[projectSlugs[i % projectSlugs.length]],
      title: def.title,
      status: def.status,
      priority: def.priority,
      due_date: daysFromNow(def.dueOffset),
    }
  })

  const { error: taskErr } = await supabase
    .from("tasks")
    .upsert(tasks, { onConflict: "id", ignoreDuplicates: true })
  if (taskErr) return NextResponse.json({ error: `Tasks seed failed: ${taskErr.message}` }, { status: 500 })

  // --- 4. Pipeline deals (5) ---
  // Ensure a pipeline + stages exist for the first project
  const mainProjectId = projectMap["acme-rebrand"]
  let pipelineId: string

  const { data: existingPipeline } = await supabase
    .from("pipelines")
    .select("id")
    .eq("project_id", mainProjectId)
    .eq("type", "sales")
    .limit(1)

  if (existingPipeline && existingPipeline.length > 0) {
    pipelineId = existingPipeline[0].id
  } else {
    const { data: newPipeline, error: plErr } = await supabase
      .from("pipelines")
      .insert({
        project_id: mainProjectId,
        user_id: seedUserId,
        name: "Sales Pipeline",
        type: "sales",
        stage_order: [],
      })
      .select("id")
      .single()
    if (plErr) return NextResponse.json({ error: `Pipeline creation failed: ${plErr.message}` }, { status: 500 })
    pipelineId = newPipeline.id
  }

  // Ensure stages exist
  const { data: existingStages } = await supabase
    .from("pipeline_stages")
    .select("id, slug")
    .eq("pipeline_id", pipelineId)

  const stageSlugToId: Record<string, string> = {}
  if (existingStages && existingStages.length > 0) {
    for (const s of existingStages) {
      stageSlugToId[s.slug] = s.id
    }
  } else {
    const stageRows = DEFAULT_STAGES.map((s) => ({
      pipeline_id: pipelineId,
      project_id: mainProjectId,
      user_id: seedUserId,
      ...s,
    }))
    const { data: insertedStages } = await supabase
      .from("pipeline_stages")
      .upsert(stageRows, { onConflict: "id" })
      .select("id, slug")
    for (const s of insertedStages ?? []) {
      stageSlugToId[s.slug] = s.id
    }
  }

  const deals = DEAL_DEFS.map((def, i) => ({
    id: demoId("dd", i + 1),
    pipeline_id: pipelineId,
    stage_id: stageSlugToId[def.stage] ?? Object.values(stageSlugToId)[0],
    project_id: mainProjectId,
    user_id: seedUserId,
    title: def.title,
    entity_type: "deal",
    metadata: { value: def.value, currency: "USD", company: def.company },
  }))

  const { error: dealErr } = await supabase
    .from("pipeline_items")
    .upsert(deals, { onConflict: "id", ignoreDuplicates: true })
  if (dealErr) return NextResponse.json({ error: `Deals seed failed: ${dealErr.message}` }, { status: 500 })

  // --- 5. Content posts (8) ---
  const contentItems = CONTENT_DEFS.map((def, i) => ({
    id: demoId("ee", i + 1),
    user_id: seedUserId,
    body: def.body,
    platform: def.platform,
    status: def.status,
    brand: def.brand,
    scheduled_for: def.status === "published" ? null : daysFromNow(def.dueOffset),
    published_at: def.status === "published" ? daysFromNow(def.dueOffset) : null,
    metadata: {},
  }))

  const { error: contentErr } = await supabase
    .from("content_items")
    .upsert(contentItems, { onConflict: "id", ignoreDuplicates: true })
  if (contentErr) return NextResponse.json({ error: `Content seed failed: ${contentErr.message}` }, { status: 500 })

  // --- 6. Sponsors (3) ---
  // Find or create event
  const { data: events } = await supabase.from("events").select("id").limit(1)
  let eventId: string | null = null

  if (events && events.length > 0) {
    eventId = events[0].id
  } else {
    const { data: newEvent, error: evErr } = await supabase
      .from("events")
      .insert({
        user_id: seedUserId,
        name: "Demo Developer Conference 2026",
        date: daysFromNow(60),
        location: "San Francisco, CA",
        status: "planning",
        budget_target: 100000,
        participant_target: 500,
      })
      .select("id")
      .single()
    if (evErr) return NextResponse.json({ error: `Event creation failed: ${evErr.message}` }, { status: 500 })
    eventId = newEvent.id
  }

  const sponsors = SPONSOR_DEFS.map((def, i) => ({
    id: demoId("ff", i + 1),
    user_id: seedUserId,
    name: def.name,
    contact_name: def.contact,
    contact_email: `${def.contact.toLowerCase().replace(/\s/g, ".")}@demo-sponsor.example`,
    tier: def.tier,
    status: def.status,
    amount: def.amount,
    currency: "USD",
    outreach_status: "sent" as const,
    event_id: eventId,
  }))

  const { error: sponsorErr } = await supabase
    .from("sponsors")
    .upsert(sponsors, { onConflict: "id", ignoreDuplicates: true })
  if (sponsorErr) return NextResponse.json({ error: `Sponsors seed failed: ${sponsorErr.message}` }, { status: 500 })

  // --- 7. Transactions (10) ---
  const transactions = TRANSACTION_DEFS.map((def, i) => ({
    id: demoId("gg", i + 1),
    user_id: seedUserId,
    name: def.name,
    amount: def.amount,
    type: def.type,
    category: def.category,
    interval: def.interval,
    due_day: def.dueDay,
  }))

  const { error: txnErr } = await supabase
    .from("transactions")
    .upsert(transactions, { onConflict: "id", ignoreDuplicates: true })
  if (txnErr) return NextResponse.json({ error: `Transactions seed failed: ${txnErr.message}` }, { status: 500 })

  return NextResponse.json({
    success: true,
    seeded: {
      projects: PROJECT_DEFS.length,
      contacts: CONTACT_DEFS.length,
      tasks: TASK_DEFS.length,
      deals: DEAL_DEFS.length,
      content: CONTENT_DEFS.length,
      sponsors: SPONSOR_DEFS.length,
      transactions: TRANSACTION_DEFS.length,
    },
  })
})
