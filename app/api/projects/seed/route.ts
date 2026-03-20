import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

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
// Project definitions
// ---------------------------------------------------------------------------

const PROJECTS = [
  {
    name: "Personize",
    slug: "personize",
    status: "active",
    phase: "priority-1",
    color: "#3B82F6",
    description:
      "AI-powered contact enrichment and outreach platform — priority-1 revenue product",
  },
  {
    name: "MEEK",
    slug: "meek",
    status: "paused",
    phase: "priority-2",
    color: "#F97316",
    description:
      "Web3 community music event brand — community building and sponsorships",
  },
  {
    name: "Hackathons",
    slug: "hackathons",
    status: "active",
    phase: "priority-3",
    color: "#EAB308",
    description:
      "Hackathon event management — organizing and running developer hackathons with tight deadlines",
  },
  {
    name: "Eventium",
    slug: "eventium",
    status: "active",
    phase: "priority-5",
    color: "#8B5CF6",
    description:
      "Fan experience and use case management platform — manages teams and use cases built from hackathon outputs",
  },
  {
    name: "Telco",
    slug: "telco",
    status: "active",
    phase: "priority-6",
    color: "#10B981",
    description:
      "Canadian telecom advocacy platform — pre-launch validation for consumer telecom transparency tools",
  },
  {
    name: "Infrastructure",
    slug: "infrastructure",
    status: "active",
    phase: "priority-4",
    color: "#6B7280",
    description:
      "Internal tooling and infrastructure — CI/CD, dashboards, DevOps, and shared platform services",
  },
];

// ---------------------------------------------------------------------------
// Tasks per project
// ---------------------------------------------------------------------------

function buildTasks(projectMap: Map<string, string>) {
  return [
    { title: "Finalize Q1 investor pitch deck", priority: "critical", status: "in_progress", due_date: daysFromNow(2), assignee: "Cyrus", project_id: projectMap.get("Personize") },
    { title: "Write API documentation for v2 endpoints", priority: "medium", status: "todo", due_date: daysFromNow(7), assignee: "Cyrus", project_id: projectMap.get("Personize") },
    { title: "Update landing page copy and CTAs", priority: "medium", status: "in_progress", due_date: daysFromNow(1), assignee: "Cyrus", project_id: projectMap.get("Personize") },
    { title: "Create onboarding email sequence", priority: "high", status: "todo", due_date: daysFromNow(3), assignee: "Cyrus", project_id: projectMap.get("Personize") },
    { title: "Migrate legacy data to new schema", priority: "critical", status: "in_progress", due_date: daysFromNow(1), assignee: "Cyrus", project_id: projectMap.get("Personize") },
    { title: "Design sponsor prospectus for MEEK", priority: "high", status: "todo", due_date: daysFromNow(5), assignee: "Cyrus", project_id: projectMap.get("MEEK") },
    { title: "Draft partnership agreement template", priority: "low", status: "todo", due_date: daysFromNow(10), assignee: null, project_id: projectMap.get("MEEK") },
    { title: "Plan community town hall agenda", priority: "low", status: "todo", due_date: daysFromNow(8), assignee: null, project_id: projectMap.get("MEEK") },
    { title: "Review hackathon judge applications", priority: "medium", status: "todo", due_date: daysFromNow(4), assignee: null, project_id: projectMap.get("Hackathons") },
    { title: "Confirm venue and AV setup for April hackathon", priority: "critical", status: "in_progress", due_date: daysFromNow(2), assignee: "Cyrus", project_id: projectMap.get("Hackathons") },
    { title: "Send reminder emails to registered participants", priority: "high", status: "todo", due_date: daysFromNow(3), assignee: "Cyrus", project_id: projectMap.get("Hackathons") },
    { title: "Configure Stripe webhooks for ticket payments", priority: "high", status: "todo", due_date: daysFromNow(6), assignee: "Cyrus", project_id: projectMap.get("Eventium") },
    { title: "Design use case submission form UI", priority: "medium", status: "in_progress", due_date: daysFromNow(4), assignee: "Cyrus", project_id: projectMap.get("Eventium") },
    { title: "Set up team management CRUD endpoints", priority: "high", status: "todo", due_date: daysFromNow(8), assignee: "Cyrus", project_id: projectMap.get("Eventium") },
    { title: "Research CRTC complaint filing process", priority: "high", status: "todo", due_date: daysFromNow(5), assignee: "Cyrus", project_id: projectMap.get("Telco") },
    { title: "Build telecom plan comparison scraper MVP", priority: "critical", status: "in_progress", due_date: daysFromNow(3), assignee: "Cyrus", project_id: projectMap.get("Telco") },
    { title: "Draft landing page copy for consumer advocacy tool", priority: "medium", status: "todo", due_date: daysFromNow(7), assignee: null, project_id: projectMap.get("Telco") },
    { title: "Set up automated CI/CD pipeline", priority: "high", status: "in_progress", due_date: daysFromNow(3), assignee: "Cyrus", project_id: projectMap.get("Infrastructure") },
    { title: "Benchmark database query performance", priority: "medium", status: "done", due_date: daysFromNow(-2), assignee: "Cyrus", project_id: projectMap.get("Infrastructure") },
    { title: "Set up error monitoring with Sentry", priority: "medium", status: "done", due_date: daysFromNow(-3), assignee: "Cyrus", project_id: projectMap.get("Infrastructure") },
    { title: "Design mobile-responsive dashboard", priority: "medium", status: "todo", due_date: daysFromNow(12), assignee: "Cyrus", project_id: projectMap.get("Infrastructure") },
  ];
}

// ---------------------------------------------------------------------------
// Contacts per project
// ---------------------------------------------------------------------------

function buildContacts(projectMap: Map<string, string>) {
  return [
    { name: "Sarah Chen", email: "sarah.chen@techcorp.io", company: "TechCorp", role: "VP Engineering", source: "linkedin", tags: ["investor", "tech"], score: 85, project_id: projectMap.get("Personize") },
    { name: "James Okonkwo", email: "james@okonkwo.ventures", company: "Okonkwo Ventures", role: "Managing Partner", source: "linkedin", tags: ["investor", "vc"], score: 92, project_id: projectMap.get("Personize") },
    { name: "David Nakamura", email: "david@nakamura.tech", company: "NakamuraTech", role: "CTO", source: "linkedin", tags: ["developer", "ai"], score: 88, project_id: projectMap.get("Personize") },
    { name: "Priya Sharma", email: "priya@startupgrid.com", company: "StartupGrid", role: "Community Lead", source: "referral", tags: ["community", "events"], score: 78, project_id: projectMap.get("MEEK") },
    { name: "Mei Lin Wong", email: "mei@wongmedia.co", company: "Wong Media", role: "Founder", source: "manual", tags: ["media", "press"], score: 70, project_id: projectMap.get("MEEK") },
    { name: "Marcus Rivera", email: "marcus@rivera.dev", company: "Rivera Studios", role: "Lead Developer", source: "referral", tags: ["developer", "partner"], score: 72, project_id: projectMap.get("Hackathons") },
    { name: "Rachel Kim", email: "rachel@kimdesign.co", company: "Kim Design", role: "UX Director", source: "website", tags: ["designer", "ux"], score: 73, project_id: projectMap.get("Hackathons") },
    { name: "Alex Thompson", email: "alex.t@cloudnine.io", company: "CloudNine", role: "Product Manager", source: "website", tags: ["tech", "saas"], score: 65, project_id: projectMap.get("Eventium") },
    { name: "Sophie Martin", email: "sophie@martingroup.fr", company: "Martin Group", role: "Strategy Consultant", source: "referral", tags: ["partner", "europe"], score: 75, project_id: projectMap.get("Telco") },
    { name: "Omar Hassan", email: "omar@hassan.tech", company: "Hassan Tech", role: "DevOps Lead", source: "linkedin", tags: ["developer", "mobile"], score: 67, project_id: projectMap.get("Infrastructure") },
  ];
}

// ---------------------------------------------------------------------------
// POST handler — admin-only seed endpoint
// ---------------------------------------------------------------------------

export const POST = withErrorHandler(async function POST(request) {
  // Admin check: require x-admin-key header or service role context
  const adminKey = request.headers.get("x-admin-key");
  const expectedKey = process.env.ADMIN_SEED_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!adminKey || adminKey !== expectedKey) {
    return NextResponse.json(
      { error: "Unauthorized — provide x-admin-key header" },
      { status: 401 }
    );
  }

  const supabase = createServiceClient();
  const results = { projects: 0, tasks: 0, contacts: 0 };

  // Resolve user_id from existing projects
  const { data: existingProject } = await supabase
    .from("projects")
    .select("user_id")
    .limit(1)
    .single();

  const userId =
    existingProject?.user_id ?? "00000000-0000-0000-0000-000000000000";

  // 1. Upsert projects
  const projectRows = PROJECTS.map((p) => ({ user_id: userId, ...p }));

  const { error: projectError, data: projectData } = await supabase
    .from("projects")
    .upsert(projectRows, { onConflict: "slug" })
    .select("id, name, slug");

  if (projectError) {
    return NextResponse.json(
      { error: `Projects upsert failed: ${projectError.message}` },
      { status: 500 }
    );
  }

  results.projects = projectData?.length ?? 0;

  const projectMap = new Map(
    (projectData ?? []).map((p: { id: string; name: string }) => [p.name, p.id])
  );

  // 2. Upsert tasks
  const taskRows = buildTasks(projectMap)
    .filter((t) => t.project_id)
    .map((t) => ({ user_id: userId, ...t }));

  const { error: taskError, data: taskData } = await supabase
    .from("tasks")
    .upsert(taskRows, { onConflict: "title" })
    .select("id");

  if (taskError) {
    return NextResponse.json(
      { error: `Tasks upsert failed: ${taskError.message}`, partial: results },
      { status: 500 }
    );
  }
  results.tasks = taskData?.length ?? 0;

  // 3. Upsert contacts
  const contactRows = buildContacts(projectMap)
    .filter((c) => c.project_id)
    .map((c) => ({ user_id: userId, ...c }));

  const { error: contactError, data: contactData } = await supabase
    .from("contacts")
    .upsert(contactRows, { onConflict: "email" })
    .select("id");

  if (contactError) {
    return NextResponse.json(
      { error: `Contacts upsert failed: ${contactError.message}`, partial: results },
      { status: 500 }
    );
  }
  results.contacts = contactData?.length ?? 0;

  return NextResponse.json({
    message: "Projects seeded successfully",
    ...results,
  });
});
