"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const LABEL_MAP: Record<string, string> = {
  contacts: "Contacts",
  tasks: "Tasks",
  finance: "Finance",
  pipeline: "Pipeline",
  meetings: "Meetings",
  analytics: "Analytics",
  notifications: "Notifications",
  content: "Content",
  conversations: "Conversations",
  community: "Community",
  activity: "Activity",
  admin: "Admin",
  settings: "Settings",
  resources: "Resources",
  sponsors: "Sponsors",
  projects: "Projects",
  hackathon: "Hackathon",
  webhooks: "Webhooks",
  // Sub-pages
  treasury: "Treasury",
  debts: "Debts",
  forecast: "Forecast",
  reimbursements: "Reimbursements",
  board: "Board",
  outreach: "Outreach",
  recurring: "Recurring",
  editor: "Editor",
  queue: "Queue",
  review: "Review",
  dedup: "Dedup",
  prep: "Prep",
  health: "Health",
  import: "Import",
  governance: "Governance",
  "data-sources": "Data Sources",
  testing: "Testing",
  checkin: "Check-in",
  new: "New",
  events: "Events",
};

function isDynamicSegment(segment: string): boolean {
  return /^[0-9a-f-]{8,}$/.test(segment) || /^\d+$/.test(segment);
}

function getLabel(segment: string): string {
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  if (isDynamicSegment(segment)) return "…";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 px-4 pt-2 pb-0 text-xs text-muted-foreground md:px-6">
        <Home className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Dashboard</span>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 px-4 pt-2 pb-0 text-xs text-muted-foreground md:px-6">
      <Link href="/" className="flex items-center hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        const label = getLabel(segment);

        return (
          <span key={href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
