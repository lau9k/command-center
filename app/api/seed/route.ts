import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

/**
 * POST /api/seed — run demo data seeding (admin only).
 *
 * Populates contacts, tasks, content_posts, and pipeline_items
 * with realistic sample data.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date();
function daysFromNow(d: number): string {
  const date = new Date(now);
  date.setDate(date.getDate() + d);
  return date.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Data definitions
// ---------------------------------------------------------------------------

const CONTACTS = [
  { name: "Sarah Chen", email: "sarah.chen@techcorp.io", company: "TechCorp", source: "linkedin", tags: ["investor", "tech"], score: 85 },
  { name: "Marcus Rivera", email: "marcus@rivera.dev", company: "Rivera Studios", source: "referral", tags: ["developer", "partner"], score: 72 },
  { name: "Elena Vasquez", email: "elena.v@designlab.co", company: "DesignLab", source: "website", tags: ["designer"], score: 68 },
  { name: "James Okonkwo", email: "james@okonkwo.ventures", company: "Okonkwo Ventures", source: "linkedin", tags: ["investor", "vc"], score: 92 },
  { name: "Priya Sharma", email: "priya@startupgrid.com", company: "StartupGrid", source: "referral", tags: ["community", "events"], score: 78 },
  { name: "Alex Thompson", email: "alex.t@cloudnine.io", company: "CloudNine", source: "website", tags: ["tech", "saas"], score: 65 },
  { name: "Mei Lin Wong", email: "mei@wongmedia.co", company: "Wong Media", source: "manual", tags: ["media", "press"], score: 70 },
  { name: "David Nakamura", email: "david@nakamura.tech", company: "NakamuraTech", source: "linkedin", tags: ["developer", "ai"], score: 88 },
  { name: "Sophie Martin", email: "sophie@martingroup.fr", company: "Martin Group", source: "referral", tags: ["partner", "europe"], score: 75 },
  { name: "Carlos Mendez", email: "carlos@mendez.co", company: "Mendez & Co", source: "website", tags: ["finance"], score: 60 },
  { name: "Aisha Patel", email: "aisha@patel.ventures", company: "Patel Ventures", source: "linkedin", tags: ["investor"], score: 90 },
  { name: "Tom Bradley", email: "tom@bradleyconsulting.com", company: "Bradley Consulting", source: "manual", tags: ["consulting"], score: 55 },
  { name: "Yuki Tanaka", email: "yuki@tanaka.jp", company: "Tanaka Corp", source: "referral", tags: ["partner", "asia"], score: 82 },
  { name: "Rachel Kim", email: "rachel@kimdesign.co", company: "Kim Design", source: "website", tags: ["designer", "ux"], score: 73 },
  { name: "Omar Hassan", email: "omar@hassan.tech", company: "Hassan Tech", source: "linkedin", tags: ["developer", "mobile"], score: 67 },
  { name: "Lisa Andersen", email: "lisa@andersen.dk", company: "Andersen Digital", source: "referral", tags: ["marketing"], score: 71 },
  { name: "Ryan O'Brien", email: "ryan@obrien.io", company: "O'Brien Labs", source: "website", tags: ["tech", "startup"], score: 64 },
  { name: "Fatima Al-Hassan", email: "fatima@alhassan.co", company: "Al-Hassan Group", source: "linkedin", tags: ["investor", "mena"], score: 86 },
  { name: "Chris Johnson", email: "chris@johnson.dev", company: "Johnson Dev", source: "manual", tags: ["developer", "freelance"], score: 58 },
  { name: "Nina Petrova", email: "nina@petrova.ru", company: "Petrova Media", source: "referral", tags: ["media", "content"], score: 76 },
];

function buildTasks(projectMap: Map<string, string>) {
  return [
    { title: "Finalize Q1 investor pitch deck", priority: "critical", status: "in_progress", due_date: daysFromNow(2), assignee: "Cyrus" , project_id: projectMap.get("Personize") },
    { title: "Set up automated CI/CD pipeline", priority: "high", status: "in_progress", due_date: daysFromNow(3), assignee: "Cyrus", project_id: projectMap.get("Infrastructure") },
    { title: "Design sponsor prospectus for MEEK", priority: "high", status: "todo", due_date: daysFromNow(5), assignee: "Cyrus", project_id: projectMap.get("MEEK") },
    { title: "Review hackathon judge applications", priority: "medium", status: "todo", due_date: daysFromNow(4), assignee: null, project_id: projectMap.get("Hackathon") },
    { title: "Write API documentation for v2 endpoints", priority: "medium", status: "todo", due_date: daysFromNow(7), assignee: "Cyrus", project_id: projectMap.get("Personize") },
    { title: "Update landing page copy and CTAs", priority: "medium", status: "in_progress", due_date: daysFromNow(1), assignee: "Cyrus", project_id: projectMap.get("Personize") },
    { title: "Configure Stripe webhooks for payments", priority: "high", status: "todo", due_date: daysFromNow(6), assignee: "Cyrus", project_id: projectMap.get("Eventium") },
    { title: "Draft partnership agreement template", priority: "low", status: "todo", due_date: daysFromNow(10), assignee: null, project_id: projectMap.get("MEEK") },
    { title: "Benchmark database query performance", priority: "medium", status: "done", due_date: daysFromNow(-2), assignee: "Cyrus", project_id: projectMap.get("Infrastructure") },
    { title: "Create onboarding email sequence", priority: "high", status: "todo", due_date: daysFromNow(3), assignee: "Cyrus", project_id: projectMap.get("Personize") },
    { title: "Set up error monitoring with Sentry", priority: "medium", status: "done", due_date: daysFromNow(-3), assignee: "Cyrus", project_id: projectMap.get("Infrastructure") },
    { title: "Plan community town hall agenda", priority: "low", status: "todo", due_date: daysFromNow(8), assignee: null, project_id: projectMap.get("MEEK") },
    { title: "Migrate legacy data to new schema", priority: "critical", status: "in_progress", due_date: daysFromNow(1), assignee: "Cyrus", project_id: projectMap.get("Personize") },
    { title: "Design mobile-responsive dashboard", priority: "medium", status: "todo", due_date: daysFromNow(12), assignee: "Cyrus", project_id: projectMap.get("Infrastructure") },
    { title: "Write launch blog post for Eventium", priority: "high", status: "done", due_date: daysFromNow(-1), assignee: "Cyrus", project_id: projectMap.get("Eventium") },
  ];
}

function buildContentPosts(projectMap: Map<string, string>) {
  return [
    { title: "Product launch announcement thread", platform: "twitter", status: "published", scheduled_for: daysFromNow(-5), caption: "Excited to announce our latest feature drop!", project_id: projectMap.get("Personize") },
    { title: "Behind the scenes: building in public", platform: "instagram", status: "published", scheduled_for: daysFromNow(-3), caption: "A look at how we build Personize from the ground up.", project_id: projectMap.get("Personize") },
    { title: "5 tips for community engagement", platform: "linkedin", status: "scheduled", scheduled_for: daysFromNow(1), caption: "Community building is an art. Here are 5 strategies that work.", project_id: projectMap.get("MEEK") },
    { title: "Weekly dev update #12", platform: "twitter", status: "scheduled", scheduled_for: daysFromNow(2), caption: "This week: performance improvements and bug fixes.", project_id: projectMap.get("Personize") },
    { title: "Hackathon highlights reel", platform: "tiktok", status: "draft", scheduled_for: daysFromNow(4), caption: "The best moments from our latest hackathon event.", project_id: projectMap.get("Hackathon") },
    { title: "Founder story: why we started", platform: "youtube", status: "draft", scheduled_for: daysFromNow(7), caption: "The journey from idea to product.", project_id: projectMap.get("Personize") },
    { title: "Community spotlight: top contributors", platform: "telegram", status: "scheduled", scheduled_for: daysFromNow(3), caption: "Celebrating our amazing community members.", project_id: projectMap.get("MEEK") },
    { title: "How to use our API in 5 minutes", platform: "youtube", status: "draft", scheduled_for: daysFromNow(10), caption: "Quick tutorial on getting started with our API.", project_id: projectMap.get("Personize") },
  ];
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const POST = withErrorHandler(
  withAuth(async (_request, _user) => {
    const supabase = createServiceClient();
    const results = { contacts: 0, tasks: 0, content: 0, pipeline: 0 };

    // 1. Get projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .order("name");

    const projectMap = new Map(
      (projects ?? []).map((p: { id: string; name: string }) => [p.name, p.id])
    );

    const defaultProjectId = projectMap.values().next().value ?? null;

    // 2. Seed contacts
    const contactRows = CONTACTS.map((c) => ({
      ...c,
      project_id: defaultProjectId,
    }));

    const { data: contactData, error: contactError } = await supabase
      .from("contacts")
      .upsert(contactRows, { onConflict: "email" })
      .select("id");

    if (contactError) {
      return NextResponse.json({ error: contactError.message }, { status: 500 });
    }
    results.contacts = contactData?.length ?? 0;

    // 3. Seed tasks
    const taskRows = buildTasks(projectMap).map((t) => ({
      ...t,
      project_id: t.project_id ?? defaultProjectId,
    }));

    const { data: taskData, error: taskError } = await supabase
      .from("tasks")
      .upsert(taskRows, { onConflict: "title" })
      .select("id");

    if (taskError) {
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }
    results.tasks = taskData?.length ?? 0;

    // 4. Seed content posts
    const contentRows = buildContentPosts(projectMap).map((c) => ({
      title: c.title,
      caption: c.caption,
      platform: c.platform,
      status: c.status,
      scheduled_for: c.scheduled_for,
      scheduled_at: c.scheduled_for,
      project_id: c.project_id ?? defaultProjectId,
      type: "post",
    }));

    const { data: contentData, error: contentError } = await supabase
      .from("content_posts")
      .upsert(contentRows, { onConflict: "title" })
      .select("id");

    if (contentError) {
      return NextResponse.json({ error: contentError.message }, { status: 500 });
    }
    results.content = contentData?.length ?? 0;

    // 5. Seed pipeline
    let pipelineId: string | null = null;
    const { data: existingPipeline } = await supabase
      .from("pipelines")
      .select("id")
      .limit(1)
      .single();

    if (existingPipeline) {
      pipelineId = existingPipeline.id;
    } else {
      const { data: newPipeline } = await supabase
        .from("pipelines")
        .insert({
          name: "Sales Pipeline",
          type: "sales",
          project_id: defaultProjectId,
        })
        .select("id")
        .single();
      pipelineId = newPipeline?.id ?? null;
    }

    if (pipelineId) {
      const stageNames = ["lead", "discovery", "qualified", "proposal", "closed"];
      const stageColors = ["#6B7280", "#3B82F6", "#F59E0B", "#8B5CF6", "#22C55E"];

      const { data: existingStages } = await supabase
        .from("pipeline_stages")
        .select("id, slug")
        .eq("pipeline_id", pipelineId);

      const stageMap = new Map<string, string>();

      if (!existingStages || existingStages.length === 0) {
        for (let i = 0; i < stageNames.length; i++) {
          const { data: stage } = await supabase
            .from("pipeline_stages")
            .insert({
              pipeline_id: pipelineId,
              project_id: defaultProjectId,
              name: stageNames[i].charAt(0).toUpperCase() + stageNames[i].slice(1),
              slug: stageNames[i],
              sort_order: i,
              color: stageColors[i],
            })
            .select("id, slug")
            .single();
          if (stage) stageMap.set(stage.slug, stage.id);
        }
      } else {
        for (const s of existingStages) {
          stageMap.set(s.slug, s.id);
        }
      }

      const pipelineRows = buildPipelineItems(projectMap, stageMap)
        .filter((item) => item.stage_id)
        .map((item) => ({
          title: item.title,
          pipeline_id: pipelineId,
          stage_id: item.stage_id,
          project_id: item.project_id ?? defaultProjectId,
          metadata: item.metadata,
          entity_type: "deal",
          sort_order: 0,
        }));

      const { data: pipelineData, error: pipelineError } = await supabase
        .from("pipeline_items")
        .upsert(pipelineRows, { onConflict: "title" })
        .select("id");

      if (pipelineError) {
        console.error("[seed] pipeline error:", pipelineError.message);
      } else {
        results.pipeline = pipelineData?.length ?? 0;
      }
    }

    return NextResponse.json(results);
  })
);

// Duplicated here since we can't import from the script file in an API route easily
function buildPipelineItems(projectMap: Map<string, string>, stageMap: Map<string, string>) {
  return [
    { title: "TechCorp Enterprise Deal", metadata: { company: "TechCorp", value: 50000, probability: 0.7, notes: "Demo scheduled next week" }, stage_id: stageMap.get("qualified"), project_id: projectMap.get("Personize") },
    { title: "StartupGrid Partnership", metadata: { company: "StartupGrid", value: 15000, probability: 0.5, notes: "Initial conversation went well" }, stage_id: stageMap.get("discovery"), project_id: projectMap.get("Personize") },
    { title: "CloudNine Integration", metadata: { company: "CloudNine", value: 25000, probability: 0.3, notes: "Exploring integration possibilities" }, stage_id: stageMap.get("lead"), project_id: projectMap.get("Personize") },
    { title: "Okonkwo Ventures Seed Round", metadata: { company: "Okonkwo Ventures", value: 200000, probability: 0.6, notes: "Term sheet under review" }, stage_id: stageMap.get("proposal"), project_id: projectMap.get("Personize") },
    { title: "MEEK Sponsor: Wong Media", metadata: { company: "Wong Media", value: 10000, probability: 0.8, notes: "Contract signed, awaiting payment" }, stage_id: stageMap.get("closed"), project_id: projectMap.get("MEEK") },
    { title: "DesignLab UX Audit", metadata: { company: "DesignLab", value: 8000, probability: 0.4, notes: "Proposal sent" }, stage_id: stageMap.get("proposal"), project_id: projectMap.get("Personize") },
    { title: "Martin Group EU Expansion", metadata: { company: "Martin Group", value: 35000, probability: 0.5, notes: "Evaluating market fit" }, stage_id: stageMap.get("discovery"), project_id: projectMap.get("Personize") },
    { title: "Patel Ventures Series A Lead", metadata: { company: "Patel Ventures", value: 500000, probability: 0.2, notes: "Early discussions" }, stage_id: stageMap.get("lead"), project_id: projectMap.get("Personize") },
    { title: "Bradley Consulting Advisory", metadata: { company: "Bradley Consulting", value: 12000, probability: 0.9, notes: "Monthly retainer agreement" }, stage_id: stageMap.get("closed"), project_id: projectMap.get("Personize") },
    { title: "Eventium Ticket Platform", metadata: { company: "Eventium", value: 20000, probability: 0.6, notes: "POC in progress" }, stage_id: stageMap.get("qualified"), project_id: projectMap.get("Eventium") },
  ];
}
