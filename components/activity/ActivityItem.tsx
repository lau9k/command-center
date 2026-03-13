"use client";

import Link from "next/link";
import {
  Users,
  CheckSquare,
  MessageSquare,
  Handshake,
  DollarSign,
  FileText,
  type LucideIcon,
} from "lucide-react";

export interface ActivityLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const entityIconMap: Record<string, LucideIcon> = {
  contact: Users,
  task: CheckSquare,
  conversation: MessageSquare,
  sponsor: Handshake,
  transaction: DollarSign,
  content_post: FileText,
};

const entityColorMap: Record<string, string> = {
  contact: "text-[#22C55E] bg-[#22C55E]/10",
  task: "text-[#3B82F6] bg-[#3B82F6]/10",
  conversation: "text-[#A855F7] bg-[#A855F7]/10",
  sponsor: "text-[#F97316] bg-[#F97316]/10",
  transaction: "text-[#EAB308] bg-[#EAB308]/10",
  content_post: "text-[#A855F7] bg-[#A855F7]/10",
};

const sourceBadgeClass: Record<string, string> = {
  manual: "bg-muted text-muted-foreground",
  webhook: "bg-[#3B82F6]/15 text-[#3B82F6]",
  n8n: "bg-[#F97316]/15 text-[#F97316]",
  granola: "bg-[#22C55E]/15 text-[#22C55E]",
  plaid: "bg-[#EAB308]/15 text-[#EAB308]",
  personize: "bg-[#A855F7]/15 text-[#A855F7]",
};

const actionVerbs: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  ingested: "Ingested",
  synced: "Synced",
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatEntityType(type: string): string {
  return type.replace(/_/g, " ");
}

const entityRouteMap: Record<string, string> = {
  contact: "/contacts",
  task: "/tasks",
  conversation: "/conversations",
  sponsor: "/sponsors",
  transaction: "/pipeline",
  content_post: "/content",
};

function getEntityHref(entry: ActivityLogEntry): string | null {
  const base = entityRouteMap[entry.entity_type];
  if (!base) return null;
  if (entry.entity_id && (entry.entity_type === "sponsor" || entry.entity_type === "contact")) {
    return `${base}/${entry.entity_id}`;
  }
  return base;
}

interface ActivityItemProps {
  entry: ActivityLogEntry;
}

export function ActivityItem({ entry }: ActivityItemProps) {
  const Icon = entityIconMap[entry.entity_type] ?? FileText;
  const colorClass = entityColorMap[entry.entity_type] ?? "text-muted-foreground bg-muted";
  const verb = actionVerbs[entry.action] ?? entry.action;
  const badgeClass = sourceBadgeClass[entry.source] ?? sourceBadgeClass.manual;
  const href = getEntityHref(entry);

  const nameContent = entry.entity_name ? (
    href ? (
      <Link href={href} className="font-medium text-foreground underline-offset-2 hover:underline">
        {entry.entity_name}
      </Link>
    ) : (
      <span className="font-medium text-foreground">{entry.entity_name}</span>
    )
  ) : null;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* Icon */}
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          <span className="font-medium">{verb}</span>{" "}
          <span className="text-muted-foreground">{formatEntityType(entry.entity_type)}</span>
          {nameContent && <> {nameContent}</>}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
            {entry.source}
          </span>
          <span className="text-xs text-muted-foreground">{relativeTime(entry.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
