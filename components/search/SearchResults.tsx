"use client";

import { useCallback } from "react";
import { ChevronRight } from "lucide-react";
import {
  getEntityLabel,
  getEntityRoute,
  type SearchEntityType,
  type SearchResult,
} from "@/lib/search";
import { cn } from "@/lib/utils";
import { EntityIcon } from "./EntityIcon";

interface SearchGroupData {
  items: SearchResult[];
  total: number;
}

interface SearchResultsProps {
  groups: Record<string, SearchGroupData>;
  activeIndex: number;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
  query: string;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);

  if (matchIndex === -1) return text;

  return (
    <>
      {text.slice(0, matchIndex)}
      <mark className="rounded-sm bg-yellow-500/20 text-inherit dark:bg-yellow-400/20">
        {text.slice(matchIndex, matchIndex + query.length)}
      </mark>
      {text.slice(matchIndex + query.length)}
    </>
  );
}

function getFlatIndex(
  groups: Record<string, SearchGroupData>,
  groupOrder: SearchEntityType[],
  targetType: SearchEntityType,
  itemIndex: number
): number {
  let flat = 0;
  for (const type of groupOrder) {
    if (type === targetType) return flat + itemIndex;
    flat += (groups[type]?.items.length ?? 0);
  }
  return flat;
}

const GROUP_ORDER: SearchEntityType[] = [
  "task",
  "contact",
  "project",
  "pipeline",
  "content",
  "meeting",
  "sponsor",
];

export function getTotalFlatCount(groups: Record<string, SearchGroupData>): number {
  return GROUP_ORDER.reduce(
    (sum, type) => sum + (groups[type]?.items.length ?? 0),
    0
  );
}

export function getFlatResult(
  groups: Record<string, SearchGroupData>,
  index: number
): SearchResult | null {
  let flat = 0;
  for (const type of GROUP_ORDER) {
    const items = groups[type]?.items;
    if (!items) continue;
    if (index < flat + items.length) {
      return items[index - flat];
    }
    flat += items.length;
  }
  return null;
}

export function SearchResults({
  groups,
  activeIndex,
  onSelect,
  onHover,
  query,
}: SearchResultsProps) {
  const visibleGroups = GROUP_ORDER.filter(
    (type) => groups[type] && groups[type].items.length > 0
  );

  const handleViewAll = useCallback(
    (type: SearchEntityType) => {
      const route = getEntityRoute(type);
      onSelect({
        id: `view-all-${type}`,
        type,
        title: `View all ${getEntityLabel(type, true)}`,
        subtitle: null,
        href: `${route}?q=${encodeURIComponent(query)}`,
      });
    },
    [onSelect, query]
  );

  if (visibleGroups.length === 0) return null;

  return (
    <div className="divide-y divide-border/50">
      {visibleGroups.map((type) => {
        const group = groups[type];
        const label = getEntityLabel(type, true);

        return (
          <div key={type} className="py-1">
            {/* Group header */}
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
                <span className="ml-1.5 text-[10px] font-normal text-muted-foreground/70">
                  {group.total}
                </span>
              </span>
              {group.total > group.items.length && (
                <button
                  type="button"
                  onClick={() => handleViewAll(type)}
                  className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Group items */}
            {group.items.map((item, i) => {
              const flatIdx = getFlatIndex(groups, GROUP_ORDER, type, i);
              const isActive = flatIdx === activeIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  data-index={flatIdx}
                  onClick={() => onSelect(item)}
                  onMouseEnter={() => onHover(flatIdx)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-accent/50"
                  )}
                >
                  <EntityIcon type={type} className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 items-baseline gap-2">
                    <span className="truncate">
                      {highlightMatch(item.title, query)}
                    </span>
                    {item.subtitle && (
                      <span className="truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
