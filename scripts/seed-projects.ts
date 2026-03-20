/**
 * Seed projects script — upserts 6 real projects with descriptions, colors,
 * statuses, and linked tasks/contacts.
 *
 * Idempotent: safe to run multiple times. Uses slug-based upsert for projects
 * and title-based conflict checks for tasks.
 *
 * Usage:
 *   npx tsx scripts/seed-projects.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
    status: "active" as const,
    phase: "priority-1",
    color: "#3B82F6",
    description:
      "AI-powered contact enrichment and outreach platform — priority-1 revenue product",
    start_date: "2025-06-01",
  },
  {
    name: "MEEK",
    slug: "meek",
    status: "paused" as const,
    phase: "priority-2",
    color: "#F97316",
    description:
      "Web3 community music event brand — community building and sponsorships",
    start_date: "2024-11-01",
  },
  {
    name: "Hackathons",
    slug: "hackathons",
    status: "active" as const,
    phase: "priority-3",
    color: "#EAB308",
    description:
      "Hackathon event management — organizing and running developer hackathons with tight deadlines",
    start_date: "2025-01-15",
  },
  {
    name: "Eventium",
    slug: "eventium",
    status: "active" as const,
    phase: "priority-5",
    color: "#8B5CF6",
    description:
      "Fan experience and use case management platform — manages teams and use cases built from hackathon outputs",
    start_date: "2025-03-01",
  },
  {
    name: "Telco",
    slug: "telco",
    status: "active" as const,
    phase: "priority-6",
    color: "#10B981",
    description:
      "Canadian telecom advocacy platform — pre-launch validation for consumer telecom transparency tools",
    start_date: "2025-09-01",
  },
  {
    name: "Infrastructure",
    slug: "infrastructure",
    status: "active" as const,
    phase: "priority-4",
    color: "#6B7280",
    description:
      "Internal tooling and infrastructure — CI/CD, dashboards, DevOps, and shared platform services",
    start_date: "2025-01-01",
  },
];

// ---------------------------------------------------------------------------
// Tasks per project
// ---------------------------------------------------------------------------

function buildTasks(projectMap: Map<string, string>) {
  return [
    // Personize
    {
      title: "Finalize Q1 investor pitch deck",
      priority: "critical",
      status: "in_progress",
      due_date: daysFromNow(2),
      assignee: "Cyrus",
      project_id: projectMap.get("Personize"),
    },
    {
      title: "Write API documentation for v2 endpoints",
      priority: "medium",
      status: "todo",
      due_date: daysFromNow(7),
      assignee: "Cyrus",
      project_id: projectMap.get("Personize"),
    },
    {
      title: "Update landing page copy and CTAs",
      priority: "medium",
      status: "in_progress",
      due_date: daysFromNow(1),
      assignee: "Cyrus",
      project_id: projectMap.get("Personize"),
    },
    {
      title: "Create onboarding email sequence",
      priority: "high",
      status: "todo",
      due_date: daysFromNow(3),
      assignee: "Cyrus",
      project_id: projectMap.get("Personize"),
    },
    {
      title: "Migrate legacy data to new schema",
      priority: "critical",
      status: "in_progress",
      due_date: daysFromNow(1),
      assignee: "Cyrus",
      project_id: projectMap.get("Personize"),
    },
    // MEEK
    {
      title: "Design sponsor prospectus for MEEK",
      priority: "high",
      status: "todo",
      due_date: daysFromNow(5),
      assignee: "Cyrus",
      project_id: projectMap.get("MEEK"),
    },
    {
      title: "Draft partnership agreement template",
      priority: "low",
      status: "todo",
      due_date: daysFromNow(10),
      assignee: null,
      project_id: projectMap.get("MEEK"),
    },
    {
      title: "Plan community town hall agenda",
      priority: "low",
      status: "todo",
      due_date: daysFromNow(8),
      assignee: null,
      project_id: projectMap.get("MEEK"),
    },
    // Hackathons
    {
      title: "Review hackathon judge applications",
      priority: "medium",
      status: "todo",
      due_date: daysFromNow(4),
      assignee: null,
      project_id: projectMap.get("Hackathons"),
    },
    {
      title: "Confirm venue and AV setup for April hackathon",
      priority: "critical",
      status: "in_progress",
      due_date: daysFromNow(2),
      assignee: "Cyrus",
      project_id: projectMap.get("Hackathons"),
    },
    {
      title: "Send reminder emails to registered participants",
      priority: "high",
      status: "todo",
      due_date: daysFromNow(3),
      assignee: "Cyrus",
      project_id: projectMap.get("Hackathons"),
    },
    // Eventium
    {
      title: "Configure Stripe webhooks for ticket payments",
      priority: "high",
      status: "todo",
      due_date: daysFromNow(6),
      assignee: "Cyrus",
      project_id: projectMap.get("Eventium"),
    },
    {
      title: "Design use case submission form UI",
      priority: "medium",
      status: "in_progress",
      due_date: daysFromNow(4),
      assignee: "Cyrus",
      project_id: projectMap.get("Eventium"),
    },
    {
      title: "Set up team management CRUD endpoints",
      priority: "high",
      status: "todo",
      due_date: daysFromNow(8),
      assignee: "Cyrus",
      project_id: projectMap.get("Eventium"),
    },
    // Telco
    {
      title: "Research CRTC complaint filing process",
      priority: "high",
      status: "todo",
      due_date: daysFromNow(5),
      assignee: "Cyrus",
      project_id: projectMap.get("Telco"),
    },
    {
      title: "Build telecom plan comparison scraper MVP",
      priority: "critical",
      status: "in_progress",
      due_date: daysFromNow(3),
      assignee: "Cyrus",
      project_id: projectMap.get("Telco"),
    },
    {
      title: "Draft landing page copy for consumer advocacy tool",
      priority: "medium",
      status: "todo",
      due_date: daysFromNow(7),
      assignee: null,
      project_id: projectMap.get("Telco"),
    },
    // Infrastructure
    {
      title: "Set up automated CI/CD pipeline",
      priority: "high",
      status: "in_progress",
      due_date: daysFromNow(3),
      assignee: "Cyrus",
      project_id: projectMap.get("Infrastructure"),
    },
    {
      title: "Benchmark database query performance",
      priority: "medium",
      status: "done",
      due_date: daysFromNow(-2),
      assignee: "Cyrus",
      project_id: projectMap.get("Infrastructure"),
    },
    {
      title: "Set up error monitoring with Sentry",
      priority: "medium",
      status: "done",
      due_date: daysFromNow(-3),
      assignee: "Cyrus",
      project_id: projectMap.get("Infrastructure"),
    },
    {
      title: "Design mobile-responsive dashboard",
      priority: "medium",
      status: "todo",
      due_date: daysFromNow(12),
      assignee: "Cyrus",
      project_id: projectMap.get("Infrastructure"),
    },
  ];
}

// ---------------------------------------------------------------------------
// Contacts linked to projects
// ---------------------------------------------------------------------------

function buildContacts(projectMap: Map<string, string>) {
  return [
    // Personize contacts
    {
      name: "Sarah Chen",
      email: "sarah.chen@techcorp.io",
      company: "TechCorp",
      role: "VP Engineering",
      source: "linkedin",
      tags: ["investor", "tech"],
      score: 85,
      project_id: projectMap.get("Personize"),
    },
    {
      name: "James Okonkwo",
      email: "james@okonkwo.ventures",
      company: "Okonkwo Ventures",
      role: "Managing Partner",
      source: "linkedin",
      tags: ["investor", "vc"],
      score: 92,
      project_id: projectMap.get("Personize"),
    },
    {
      name: "David Nakamura",
      email: "david@nakamura.tech",
      company: "NakamuraTech",
      role: "CTO",
      source: "linkedin",
      tags: ["developer", "ai"],
      score: 88,
      project_id: projectMap.get("Personize"),
    },
    // MEEK contacts
    {
      name: "Priya Sharma",
      email: "priya@startupgrid.com",
      company: "StartupGrid",
      role: "Community Lead",
      source: "referral",
      tags: ["community", "events"],
      score: 78,
      project_id: projectMap.get("MEEK"),
    },
    {
      name: "Mei Lin Wong",
      email: "mei@wongmedia.co",
      company: "Wong Media",
      role: "Founder",
      source: "manual",
      tags: ["media", "press"],
      score: 70,
      project_id: projectMap.get("MEEK"),
    },
    // Hackathons contacts
    {
      name: "Marcus Rivera",
      email: "marcus@rivera.dev",
      company: "Rivera Studios",
      role: "Lead Developer",
      source: "referral",
      tags: ["developer", "partner"],
      score: 72,
      project_id: projectMap.get("Hackathons"),
    },
    {
      name: "Rachel Kim",
      email: "rachel@kimdesign.co",
      company: "Kim Design",
      role: "UX Director",
      source: "website",
      tags: ["designer", "ux"],
      score: 73,
      project_id: projectMap.get("Hackathons"),
    },
    // Eventium contacts
    {
      name: "Alex Thompson",
      email: "alex.t@cloudnine.io",
      company: "CloudNine",
      role: "Product Manager",
      source: "website",
      tags: ["tech", "saas"],
      score: 65,
      project_id: projectMap.get("Eventium"),
    },
    // Telco contacts
    {
      name: "Sophie Martin",
      email: "sophie@martingroup.fr",
      company: "Martin Group",
      role: "Strategy Consultant",
      source: "referral",
      tags: ["partner", "europe"],
      score: 75,
      project_id: projectMap.get("Telco"),
    },
    // Infrastructure contacts
    {
      name: "Omar Hassan",
      email: "omar@hassan.tech",
      company: "Hassan Tech",
      role: "DevOps Lead",
      source: "linkedin",
      tags: ["developer", "mobile"],
      score: 67,
      project_id: projectMap.get("Infrastructure"),
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function seedProjects() {
  const results = { projects: 0, tasks: 0, contacts: 0 };

  // 1. Resolve user_id — take the first existing user
  const { data: existingProject } = await supabase
    .from("projects")
    .select("user_id")
    .limit(1)
    .single();

  const userId =
    existingProject?.user_id ?? "00000000-0000-0000-0000-000000000000";

  // 2. Upsert projects
  console.log("[seed-projects] Upserting projects...");
  const projectRows = PROJECTS.map((p) => ({
    user_id: userId,
    name: p.name,
    slug: p.slug,
    status: p.status,
    phase: p.phase,
    color: p.color,
    description: p.description,
  }));

  const { error: projectError, data: projectData } = await supabase
    .from("projects")
    .upsert(projectRows, { onConflict: "slug" })
    .select("id, name, slug");

  if (projectError) {
    console.error("[seed-projects] projects error:", projectError.message);
    return results;
  }

  results.projects = projectData?.length ?? 0;
  console.log(`[seed-projects] Upserted ${results.projects} projects`);

  const projectMap = new Map(
    (projectData ?? []).map((p: { id: string; name: string }) => [p.name, p.id])
  );

  // 3. Upsert tasks
  console.log("[seed-projects] Upserting tasks...");
  const taskRows = buildTasks(projectMap)
    .filter((t) => t.project_id)
    .map((t) => ({
      user_id: userId,
      title: t.title,
      priority: t.priority,
      status: t.status,
      due_date: t.due_date,
      assignee: t.assignee,
      project_id: t.project_id,
    }));

  const { error: taskError, data: taskData } = await supabase
    .from("tasks")
    .upsert(taskRows, { onConflict: "title" })
    .select("id");

  if (taskError) {
    console.error("[seed-projects] tasks error:", taskError.message);
  } else {
    results.tasks = taskData?.length ?? 0;
    console.log(`[seed-projects] Upserted ${results.tasks} tasks`);
  }

  // 4. Upsert contacts
  console.log("[seed-projects] Upserting contacts...");
  const contactRows = buildContacts(projectMap)
    .filter((c) => c.project_id)
    .map((c) => ({
      user_id: userId,
      name: c.name,
      email: c.email,
      company: c.company,
      role: c.role,
      source: c.source,
      tags: c.tags,
      score: c.score,
      project_id: c.project_id,
    }));

  const { error: contactError, data: contactData } = await supabase
    .from("contacts")
    .upsert(contactRows, { onConflict: "email" })
    .select("id");

  if (contactError) {
    console.error("[seed-projects] contacts error:", contactError.message);
  } else {
    results.contacts = contactData?.length ?? 0;
    console.log(`[seed-projects] Upserted ${results.contacts} contacts`);
  }

  console.log("[seed-projects] Done!", results);
  return results;
}

// Run if called directly
seedProjects()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-projects] Fatal error:", err);
    process.exit(1);
  });
