"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  CheckSquare,
  Clock,
  FileText,
  FolderOpen,
  Handshake,
  LayoutDashboard,
  Loader2,
  Plus,
  Search,
  Settings,
  Upload,
  Users,
} from "lucide-react";
import { SearchResultGroup } from "./SearchResultGroup";
import {
  groupSearchResults,
  type SearchResult,
} from "@/lib/search";

const RECENT_PAGES_KEY = "command-palette-recent-pages";
const MAX_RECENT = 10;

interface RecentPage {
  label: string;
  href: string;
}

const staticRoutes = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Master Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Content", href: "/content", icon: FileText },
  { label: "Sponsors", href: "/sponsors", icon: Handshake },
  { label: "Projects", href: "/projects", icon: FolderOpen },
  { label: "Import", href: "/admin/import", icon: Upload },
  { label: "Settings", href: "/settings", icon: Settings },
];

const groupHeadingClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground aria-selected:bg-accent aria-selected:text-foreground";

function getRecentPages(): RecentPage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_PAGES_KEY);
    return stored ? (JSON.parse(stored) as RecentPage[]) : [];
  } catch {
    return [];
  }
}

function addRecentPage(page: RecentPage) {
  const recent = getRecentPages().filter((p) => p.href !== page.href);
  recent.unshift(page);
  localStorage.setItem(
    RECENT_PAGES_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT))
  );
}

interface GlobalSearchProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ isOpen, onOpenChange }: GlobalSearchProps) {
  const [openCount, setOpenCount] = useState(0);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (isOpen) {
      setOpenCount((c) => c + 1);
    } else {
      setQuery("");
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/global?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data: { results: SearchResult[] } = await res.json();
          setSearchResults(data.results);
        }
      } catch {
        // Silently fail
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recentPages = useMemo(() => getRecentPages(), [openCount]);

  const navigateTo = useCallback(
    (href: string, label: string) => {
      addRecentPage({ label, href });
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      navigateTo(result.href, result.title);
    },
    [navigateTo]
  );

  const grouped = useMemo(
    () => groupSearchResults(searchResults),
    [searchResults]
  );

  const isActiveSearch = query.length >= 2;
  const hasSearchResults = searchResults.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed top-[20%] left-1/2 w-full max-w-[640px] -translate-x-1/2 px-4 sm:px-0">
        <Command
          className="rounded-xl border border-border bg-card text-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
          loop
          shouldFilter={!isActiveSearch}
        >
          <div className="flex items-center border-b border-border px-4">
            {isSearching ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <Command.Input
              placeholder="Search tasks, contacts, projects, content, sponsors..."
              className="flex h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              value={query}
              onValueChange={setQuery}
            />
            <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
              ESC
            </kbd>
          </div>
          <Command.List className="max-h-[320px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {isActiveSearch
                ? `No results found for "${query}".`
                : "Start typing to search across all entities."}
            </Command.Empty>

            {isActiveSearch &&
              hasSearchResults &&
              grouped.map((group) => (
                <SearchResultGroup
                  key={group.type}
                  group={group}
                  query={query}
                  onSelect={handleResultSelect}
                />
              ))}

            {!isActiveSearch && (
              <>
                {recentPages.length > 0 && (
                  <Command.Group
                    heading="Recent"
                    className={groupHeadingClass}
                  >
                    {recentPages.map((page) => (
                      <Command.Item
                        key={`recent-${page.href}`}
                        value={`recent ${page.label}`}
                        onSelect={() => navigateTo(page.href, page.label)}
                        className={itemClass}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {page.label}
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                <Command.Group
                  heading="Navigation"
                  className={groupHeadingClass}
                >
                  {staticRoutes.map((route) => (
                    <Command.Item
                      key={route.href}
                      value={route.label}
                      onSelect={() => navigateTo(route.href, route.label)}
                      className={itemClass}
                    >
                      <route.icon className="h-4 w-4 text-muted-foreground" />
                      {route.label}
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group
                  heading="Quick Actions"
                  className={groupHeadingClass}
                >
                  <Command.Item
                    value="New Task"
                    onSelect={() =>
                      navigateTo("/tasks?create=true", "New Task")
                    }
                    className={itemClass}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    New Task
                  </Command.Item>
                  <Command.Item
                    value="New Contact"
                    onSelect={() =>
                      navigateTo("/contacts?create=true", "New Contact")
                    }
                    className={itemClass}
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    New Contact
                  </Command.Item>
                </Command.Group>
              </>
            )}
          </Command.List>

          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  &uarr;&darr;
                </kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  &crarr;
                </kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  esc
                </kbd>
                close
              </span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
