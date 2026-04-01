"use client";

import { Command } from "cmdk";
import {
  Calendar,
  CheckSquare,
  FileText,
  Handshake,
  Layers,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SearchResultItem {
  id: string;
  type: "contact" | "pipeline" | "content" | "task" | "sponsor" | "meeting";
  title: string;
  subtitle: string | null;
  href: string;
}

interface SearchResultsProps {
  results: SearchResultItem[];
  onSelect: (href: string, label: string) => void;
}

const typeConfig: Record<
  SearchResultItem["type"],
  { icon: LucideIcon; label: string }
> = {
  task: { icon: CheckSquare, label: "Tasks" },
  contact: { icon: Users, label: "Contacts" },
  pipeline: { icon: Layers, label: "Pipeline" },
  content: { icon: FileText, label: "Content" },
  sponsor: { icon: Handshake, label: "Sponsors" },
  meeting: { icon: Calendar, label: "Meetings" },
};

const groupHeadingClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#666]";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground aria-selected:bg-accent aria-selected:text-foreground";

function groupByType(
  results: SearchResultItem[]
): Array<[SearchResultItem["type"], SearchResultItem[]]> {
  const order: SearchResultItem["type"][] = [
    "task",
    "contact",
    "pipeline",
    "content",
    "meeting",
    "sponsor",
  ];
  const groups: Partial<Record<SearchResultItem["type"], SearchResultItem[]>> =
    {};
  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type]!.push(r);
  }
  return order
    .filter((t) => groups[t] && groups[t]!.length > 0)
    .map((t) => [t, groups[t]!]);
}

export function SearchResults({ results, onSelect }: SearchResultsProps) {
  if (results.length === 0) return null;

  const grouped = groupByType(results);

  return (
    <>
      {grouped.map(([type, items]) => {
        const config = typeConfig[type];
        const Icon = config.icon;
        return (
          <Command.Group
            key={type}
            heading={config.label}
            className={groupHeadingClass}
          >
            {items.map((item) => (
              <Command.Item
                key={`search-${item.id}`}
                value={`search ${item.type} ${item.title} ${item.subtitle ?? ""}`}
                onSelect={() => onSelect(item.href, item.title)}
                className={itemClass}
              >
                <Icon className="h-4 w-4 shrink-0 text-[#888]" />
                <div className="flex min-w-0 flex-1 items-baseline gap-2">
                  <span className="truncate">{item.title}</span>
                  {item.subtitle && (
                    <span className="truncate text-xs text-[#666]">
                      {item.subtitle}
                    </span>
                  )}
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        );
      })}
    </>
  );
}
