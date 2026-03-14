"use client";

import { Command } from "cmdk";
import { ChevronRight } from "lucide-react";
import {
  getEntityIcon,
  getEntityRoute,
  type SearchResult,
  type SearchResultGroup as SearchResultGroupType,
} from "@/lib/search";

const groupHeadingClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground aria-selected:bg-accent aria-selected:text-foreground";

interface SearchResultGroupProps {
  group: SearchResultGroupType;
  query: string;
  onSelect: (result: SearchResult) => void;
  showViewAll?: boolean;
}

export function SearchResultGroup({
  group,
  query,
  onSelect,
  showViewAll = true,
}: SearchResultGroupProps) {
  const Icon = getEntityIcon(group.type);
  const viewAllRoute = `${getEntityRoute(group.type)}?q=${encodeURIComponent(query)}`;

  return (
    <Command.Group heading={group.label} className={groupHeadingClass}>
      {group.items.map((result) => (
        <Command.Item
          key={`search-${result.id}`}
          value={`search ${result.type} ${result.title} ${result.subtitle ?? ""}`}
          onSelect={() => onSelect(result)}
          className={itemClass}
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <span className="truncate">{result.title}</span>
            {result.subtitle && (
              <span className="truncate text-xs text-muted-foreground">
                {result.subtitle}
              </span>
            )}
          </div>
        </Command.Item>
      ))}
      {showViewAll && group.items.length >= 5 && (
        <Command.Item
          value={`view-all-${group.type}`}
          onSelect={() =>
            onSelect({
              id: `view-all-${group.type}`,
              type: group.type,
              title: `View all ${group.label}`,
              subtitle: null,
              href: viewAllRoute,
            })
          }
          className={itemClass}
        >
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium">
            View all {group.label.toLowerCase()} results
          </span>
        </Command.Item>
      )}
    </Command.Group>
  );
}
