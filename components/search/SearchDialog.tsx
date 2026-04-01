"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import {
  getEntityLabel,
  type SearchEntityType,
  type SearchResult,
} from "@/lib/search";
import { EntityIcon } from "./EntityIcon";
import { cn } from "@/lib/utils";
import {
  SearchResults,
  getTotalFlatCount,
  getFlatResult,
} from "./SearchResults";
import { SearchPreview } from "./SearchPreview";

const SEARCH_DEBOUNCE_MS = 300;

const FILTER_TYPES: SearchEntityType[] = [
  "task",
  "contact",
  "pipeline",
  "content",
  "meeting",
  "sponsor",
];

interface SearchGroupData {
  items: SearchResult[];
  total: number;
}

interface SearchApiResponse {
  results: SearchResult[];
  groups: Record<string, SearchGroupData>;
  totalCount: number;
}

interface SearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ isOpen, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Record<string, SearchGroupData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [typeFilter, setTypeFilter] = useState<SearchEntityType | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const totalFlatCount = useMemo(() => getTotalFlatCount(groups), [groups]);

  const activeResult = useMemo(
    () => getFlatResult(groups, activeIndex),
    [groups, activeIndex]
  );

  // Reset on close
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setGroups({});
      setIsLoading(false);
      setActiveIndex(0);
      setTypeFilter(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setGroups({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query });
        if (typeFilter) params.set("type", typeFilter);

        const res = await fetch(`/api/search?${params.toString()}`);
        if (res.ok) {
          const data: SearchApiResponse = await res.json();
          setGroups(data.groups);
          setActiveIndex(0);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, typeFilter]);

  const navigateToResult = useCallback(
    (result: SearchResult) => {
      onOpenChange(false);
      router.push(result.href);
    },
    [onOpenChange, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < totalFlatCount - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : totalFlatCount - 1
          );
          break;
        case "Enter": {
          e.preventDefault();
          const result = getFlatResult(groups, activeIndex);
          if (result) navigateToResult(result);
          break;
        }
        case "Tab": {
          e.preventDefault();
          const currentIdx = typeFilter
            ? FILTER_TYPES.indexOf(typeFilter)
            : -1;
          if (e.shiftKey) {
            // Shift+Tab goes backwards, wraps to "All" (null)
            setTypeFilter(
              currentIdx <= 0 ? null : FILTER_TYPES[currentIdx - 1]
            );
          } else {
            // Tab goes forward, wraps to "All" (null)
            setTypeFilter(
              currentIdx >= FILTER_TYPES.length - 1
                ? null
                : FILTER_TYPES[currentIdx + 1]
            );
          }
          break;
        }
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [totalFlatCount, groups, activeIndex, navigateToResult, typeFilter, onOpenChange]
  );

  // Scroll active item into view
  useEffect(() => {
    const activeItem = listRef.current?.querySelector(
      `[data-index="${activeIndex}"]`
    );
    activeItem?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!isOpen) return null;

  const isActiveSearch = query.length >= 2;
  const hasResults = totalFlatCount > 0;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div
        className="fixed top-[15%] left-1/2 w-full max-w-[860px] -translate-x-1/2 px-4 sm:px-0"
        onKeyDown={handleKeyDown}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search input */}
          <div className="flex items-center border-b border-border px-4">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across tasks, contacts, deals, content, meetings, sponsors..."
              className="flex h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="ml-2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="ml-2 hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
              ESC
            </kbd>
          </div>

          {/* Type filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 py-1.5">
            <FilterTab
              label="All"
              isActive={typeFilter === null}
              onClick={() => setTypeFilter(null)}
            />
            {FILTER_TYPES.map((type) => (
              <FilterTab
                key={type}
                label={getEntityLabel(type, true)}
                icon={<EntityIcon type={type} className="h-3 w-3" />}
                isActive={typeFilter === type}
                onClick={() => setTypeFilter(type)}
              />
            ))}
          </div>

          {/* Body: results + preview */}
          <div className="flex">
            {/* Results panel */}
            <div
              ref={listRef}
              className={cn(
                "max-h-[400px] overflow-y-auto overscroll-contain",
                hasResults && isActiveSearch
                  ? "w-full sm:w-[55%] sm:border-r sm:border-border"
                  : "w-full"
              )}
            >
              {!isActiveSearch && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search across all entities.
                </div>
              )}

              {isActiveSearch && !isLoading && !hasResults && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No results found for &ldquo;{query}&rdquo;
                  {typeFilter && (
                    <>
                      {" "}in {getEntityLabel(typeFilter, true).toLowerCase()}
                    </>
                  )}
                  .
                </div>
              )}

              {isActiveSearch && hasResults && (
                <SearchResults
                  groups={groups}
                  activeIndex={activeIndex}
                  onSelect={navigateToResult}
                  onHover={setActiveIndex}
                  query={query}
                />
              )}
            </div>

            {/* Preview panel — desktop only, shown when results exist */}
            {isActiveSearch && hasResults && (
              <div className="hidden max-h-[400px] w-[45%] sm:block">
                <SearchPreview
                  result={activeResult}
                  onNavigate={() => onOpenChange(false)}
                  className="h-full"
                />
              </div>
            )}
          </div>

          {/* Mobile preview — below results */}
          {isActiveSearch && hasResults && activeResult && (
            <div className="border-t border-border sm:hidden">
              <SearchPreview
                result={activeResult}
                onNavigate={() => onOpenChange(false)}
                className="max-h-[200px]"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  &uarr;&darr;
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  &crarr;
                </kbd>
                open
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  tab
                </kbd>
                filter
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  esc
                </kbd>
                close
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterTab({
  label,
  icon,
  isActive,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
