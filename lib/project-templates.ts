import type { TaskPriority, TaskStatus } from "@/lib/types/database";

// ── Template task definition ─────────────────────────────────

export interface TemplateTask {
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDaysFromNow: number | null;
  tags: string[];
}

// ── Template pipeline stage definition ───────────────────────

export interface TemplatePipelineStage {
  name: string;
  slug: string;
  sort_order: number;
  color: string;
}

// ── Template definition ──────────────────────────────────────

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tasks: TemplateTask[];
  pipelineStages: TemplatePipelineStage[];
  pipelineType: "sales" | "content" | "sponsors" | "tasks";
}

// ── Templates ────────────────────────────────────────────────

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Start from scratch with an empty project.",
    icon: "FileText",
    color: "#6B7280",
    tasks: [],
    pipelineStages: [],
    pipelineType: "tasks",
  },
  {
    id: "hackathon",
    name: "Hackathon",
    description:
      "Sponsor outreach, logistics, judging criteria, and event coordination.",
    icon: "Trophy",
    color: "#8B5CF6",
    tasks: [
      {
        title: "Secure venue and confirm date",
        description: "Research and book a venue that fits the expected number of participants.",
        priority: "critical",
        status: "todo",
        dueDaysFromNow: 30,
        tags: ["logistics"],
      },
      {
        title: "Create sponsor outreach list",
        description: "Identify 20+ potential sponsors and gather contact information.",
        priority: "high",
        status: "todo",
        dueDaysFromNow: 14,
        tags: ["sponsors"],
      },
      {
        title: "Design sponsor deck",
        description: "Create a compelling pitch deck with tier options and benefits.",
        priority: "high",
        status: "todo",
        dueDaysFromNow: 14,
        tags: ["sponsors"],
      },
      {
        title: "Set up registration page",
        description: "Build or configure a registration form and landing page.",
        priority: "medium",
        status: "todo",
        dueDaysFromNow: 21,
        tags: ["logistics"],
      },
      {
        title: "Define judging criteria and recruit judges",
        description: "Establish scoring rubric and confirm 3-5 judges.",
        priority: "medium",
        status: "todo",
        dueDaysFromNow: 21,
        tags: ["judging"],
      },
      {
        title: "Plan catering and supplies",
        description: "Arrange food, drinks, swag, and AV equipment.",
        priority: "medium",
        status: "todo",
        dueDaysFromNow: 7,
        tags: ["logistics"],
      },
      {
        title: "Create event-day run sheet",
        description: "Minute-by-minute schedule covering setup, talks, hacking blocks, and demos.",
        priority: "low",
        status: "todo",
        dueDaysFromNow: 5,
        tags: ["logistics"],
      },
      {
        title: "Send post-event surveys",
        description: "Prepare participant and sponsor feedback surveys.",
        priority: "low",
        status: "todo",
        dueDaysFromNow: null,
        tags: ["follow-up"],
      },
    ],
    pipelineStages: [
      { name: "Planning", slug: "planning", sort_order: 0, color: "#3B82F6" },
      { name: "Outreach", slug: "outreach", sort_order: 1, color: "#A855F7" },
      { name: "Confirmed", slug: "confirmed", sort_order: 2, color: "#22C55E" },
      { name: "Completed", slug: "completed", sort_order: 3, color: "#6B7280" },
    ],
    pipelineType: "sponsors",
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description:
      "Timeline management, content creation, and go-to-market pipeline.",
    icon: "Rocket",
    color: "#F97316",
    tasks: [
      {
        title: "Define launch date and milestones",
        description: "Lock in the target launch date and create a milestone timeline.",
        priority: "critical",
        status: "todo",
        dueDaysFromNow: 7,
        tags: ["planning"],
      },
      {
        title: "Write launch blog post",
        description: "Draft and review the main announcement blog post.",
        priority: "high",
        status: "todo",
        dueDaysFromNow: 14,
        tags: ["content"],
      },
      {
        title: "Create social media assets",
        description: "Design graphics and copy for Twitter, LinkedIn, and other platforms.",
        priority: "high",
        status: "todo",
        dueDaysFromNow: 14,
        tags: ["content"],
      },
      {
        title: "Prepare press kit",
        description: "Assemble logos, screenshots, one-pager, and key messaging.",
        priority: "medium",
        status: "todo",
        dueDaysFromNow: 10,
        tags: ["content"],
      },
      {
        title: "Set up analytics and tracking",
        description: "Configure conversion tracking, UTM links, and dashboards.",
        priority: "medium",
        status: "todo",
        dueDaysFromNow: 5,
        tags: ["technical"],
      },
      {
        title: "Coordinate email campaign",
        description: "Draft and schedule launch email sequence to subscribers.",
        priority: "medium",
        status: "todo",
        dueDaysFromNow: 3,
        tags: ["content"],
      },
    ],
    pipelineStages: [
      { name: "Backlog", slug: "backlog", sort_order: 0, color: "#6B7280" },
      { name: "In Progress", slug: "in-progress", sort_order: 1, color: "#3B82F6" },
      { name: "Review", slug: "review", sort_order: 2, color: "#EAB308" },
      { name: "Ready", slug: "ready", sort_order: 3, color: "#22C55E" },
      { name: "Launched", slug: "launched", sort_order: 4, color: "#8B5CF6" },
    ],
    pipelineType: "content",
  },
  {
    id: "sponsorship",
    name: "Sponsorship",
    description:
      "Prospect pipeline, outreach tasks, and sponsor relationship tracking.",
    icon: "Handshake",
    color: "#22C55E",
    tasks: [
      {
        title: "Build prospect list",
        description: "Research and list 30+ potential sponsors with contact info and fit score.",
        priority: "critical",
        status: "todo",
        dueDaysFromNow: 7,
        tags: ["prospecting"],
      },
      {
        title: "Create sponsorship tiers",
        description: "Define Bronze, Silver, Gold, and Platinum packages with benefits.",
        priority: "high",
        status: "todo",
        dueDaysFromNow: 7,
        tags: ["planning"],
      },
      {
        title: "Draft outreach email templates",
        description: "Write initial outreach and follow-up email templates.",
        priority: "high",
        status: "todo",
        dueDaysFromNow: 10,
        tags: ["outreach"],
      },
      {
        title: "Begin outreach campaign",
        description: "Send initial outreach emails to top 10 prospects.",
        priority: "medium",
        status: "todo",
        dueDaysFromNow: 14,
        tags: ["outreach"],
      },
      {
        title: "Schedule follow-up calls",
        description: "Book intro calls with interested sponsors.",
        priority: "medium",
        status: "todo",
        dueDaysFromNow: 21,
        tags: ["outreach"],
      },
      {
        title: "Prepare sponsor agreements",
        description: "Draft contracts and invoicing templates for confirmed sponsors.",
        priority: "low",
        status: "todo",
        dueDaysFromNow: null,
        tags: ["admin"],
      },
    ],
    pipelineStages: [
      { name: "Prospect", slug: "prospect", sort_order: 0, color: "#3B82F6" },
      { name: "Contacted", slug: "contacted", sort_order: 1, color: "#A855F7" },
      { name: "Negotiating", slug: "negotiating", sort_order: 2, color: "#EAB308" },
      { name: "Confirmed", slug: "confirmed", sort_order: 3, color: "#22C55E" },
      { name: "Declined", slug: "declined", sort_order: 4, color: "#6B7280" },
    ],
    pipelineType: "sponsors",
  },
];

export function getTemplateById(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id);
}
