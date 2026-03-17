import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Calendar,
  CheckSquare,
  DollarSign,
  FileText,
  FolderOpen,
  Handshake,
  LayoutDashboard,
  Library,
  Mail,
  MessageSquare,
  Radio,
  RefreshCw,
  Settings,
  Upload,
  Users,
  UsersRound,
} from "lucide-react";

export interface CommandRegistryItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  keywords: string[];
  section: "module" | "project";
}

/**
 * All navigable routes derived from the sidebar modules.
 * Keywords enable fuzzy matching in the command palette.
 */
export const navigationRegistry: CommandRegistryItem[] = [
  {
    id: "nav-dashboard",
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    keywords: ["home", "overview", "main"],
    section: "module",
  },
  {
    id: "nav-tasks",
    label: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    keywords: ["todo", "task", "checklist", "master"],
    section: "module",
  },
  {
    id: "nav-import",
    label: "Import",
    href: "/admin/import",
    icon: Upload,
    keywords: ["upload", "csv", "data", "ingest"],
    section: "module",
  },
  {
    id: "nav-finance",
    label: "Finance",
    href: "/finance",
    icon: DollarSign,
    keywords: ["money", "budget", "transactions", "treasury"],
    section: "module",
  },
  {
    id: "nav-meetings",
    label: "Meetings",
    href: "/meetings",
    icon: Calendar,
    keywords: ["calendar", "schedule", "call", "event"],
    section: "module",
  },
  {
    id: "nav-contacts",
    label: "Contacts",
    href: "/contacts",
    icon: Users,
    keywords: ["people", "crm", "leads", "network"],
    section: "module",
  },
  {
    id: "nav-conversations",
    label: "Conversations",
    href: "/conversations",
    icon: MessageSquare,
    keywords: ["chat", "messages", "email", "inbox"],
    section: "module",
  },
  {
    id: "nav-sponsors",
    label: "Sponsors",
    href: "/sponsors",
    icon: Handshake,
    keywords: ["sponsorship", "partner", "deal"],
    section: "module",
  },
  {
    id: "nav-content",
    label: "Content",
    href: "/content",
    icon: FileText,
    keywords: ["posts", "social", "media", "publish"],
    section: "module",
  },
  {
    id: "nav-resources",
    label: "Resources",
    href: "/resources",
    icon: Library,
    keywords: ["files", "documents", "library"],
    section: "module",
  },
  {
    id: "nav-analytics",
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    keywords: ["stats", "metrics", "reports", "chart"],
    section: "module",
  },
  {
    id: "nav-community",
    label: "Community",
    href: "/community",
    icon: UsersRound,
    keywords: ["members", "group", "social"],
    section: "module",
  },
  {
    id: "nav-templates",
    label: "Templates",
    href: "/templates",
    icon: Mail,
    keywords: ["email", "template", "outreach"],
    section: "module",
  },
  {
    id: "nav-webhooks",
    label: "Webhooks",
    href: "/webhooks",
    icon: Radio,
    keywords: ["hook", "integration", "api"],
    section: "module",
  },
  {
    id: "nav-sync",
    label: "Sync Log",
    href: "/sync",
    icon: RefreshCw,
    keywords: ["sync", "log", "history"],
    section: "module",
  },
  {
    id: "nav-activity",
    label: "Activity",
    href: "/activity",
    icon: Activity,
    keywords: ["feed", "log", "recent", "history"],
    section: "module",
  },
  {
    id: "nav-settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    keywords: ["config", "preferences", "account"],
    section: "module",
  },
];

/**
 * Simple fuzzy match: checks if all characters in the query appear
 * in order within the target string.
 */
export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

/**
 * Filter registry items by a fuzzy query against label and keywords.
 */
export function filterRegistry(
  items: CommandRegistryItem[],
  query: string
): CommandRegistryItem[] {
  if (!query.trim()) return items;
  return items.filter(
    (item) =>
      fuzzyMatch(query, item.label) ||
      item.keywords.some((kw) => fuzzyMatch(query, kw))
  );
}

/**
 * Build project navigation items dynamically.
 */
export function buildProjectItems(
  projects: Array<{ id: string; name: string }>
): CommandRegistryItem[] {
  return projects.map((p) => ({
    id: `nav-project-${p.id}`,
    label: `${p.name} Workspace`,
    href: `/projects/${p.id}`,
    icon: FolderOpen,
    keywords: [p.name.toLowerCase(), "project", "workspace"],
    section: "project" as const,
  }));
}
