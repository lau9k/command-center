import type { LucideIcon } from "lucide-react";
import {
  CheckSquare,
  Users,
  BarChart3,
  FileText,
  Handshake,
  FolderOpen,
} from "lucide-react";

export type SearchEntityType =
  | "task"
  | "contact"
  | "pipeline"
  | "content"
  | "sponsor"
  | "project";

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface SearchResultGroup {
  type: SearchEntityType;
  label: string;
  items: SearchResult[];
}

interface EntityConfig {
  label: string;
  pluralLabel: string;
  icon: LucideIcon;
  route: string;
}

const ENTITY_CONFIG: Record<SearchEntityType, EntityConfig> = {
  task: {
    label: "Task",
    pluralLabel: "Tasks",
    icon: CheckSquare,
    route: "/tasks",
  },
  contact: {
    label: "Contact",
    pluralLabel: "Contacts",
    icon: Users,
    route: "/contacts",
  },
  pipeline: {
    label: "Pipeline",
    pluralLabel: "Pipeline",
    icon: BarChart3,
    route: "/pipeline",
  },
  content: {
    label: "Content",
    pluralLabel: "Content",
    icon: FileText,
    route: "/content",
  },
  sponsor: {
    label: "Sponsor",
    pluralLabel: "Sponsors",
    icon: Handshake,
    route: "/sponsors",
  },
  project: {
    label: "Project",
    pluralLabel: "Projects",
    icon: FolderOpen,
    route: "/projects",
  },
};

export function getEntityIcon(type: SearchEntityType): LucideIcon {
  return ENTITY_CONFIG[type].icon;
}

export function getEntityRoute(type: SearchEntityType): string {
  return ENTITY_CONFIG[type].route;
}

export function getEntityLabel(
  type: SearchEntityType,
  plural = false
): string {
  return plural ? ENTITY_CONFIG[type].pluralLabel : ENTITY_CONFIG[type].label;
}

export function groupSearchResults(results: SearchResult[]): SearchResultGroup[] {
  const typeOrder: SearchEntityType[] = [
    "task",
    "contact",
    "project",
    "pipeline",
    "content",
    "sponsor",
  ];

  const groups: Partial<Record<SearchEntityType, SearchResult[]>> = {};
  for (const result of results) {
    if (!groups[result.type]) groups[result.type] = [];
    groups[result.type]!.push(result);
  }

  return typeOrder
    .filter((type) => groups[type] && groups[type]!.length > 0)
    .map((type) => ({
      type,
      label: ENTITY_CONFIG[type].pluralLabel,
      items: groups[type]!,
    }));
}

export function formatSearchResult(result: SearchResult): string {
  const config = ENTITY_CONFIG[result.type];
  return result.subtitle
    ? `${config.label}: ${result.title} (${result.subtitle})`
    : `${config.label}: ${result.title}`;
}
