"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  CheckSquare,
  Clock,
  DollarSign,
  FileText,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Loader2,
  Plus,
  Search,
  Settings,
  Upload,
  Users,
} from "lucide-react";

const RECENT_PAGES_KEY = "command-palette-recent-pages";
const MAX_RECENT = 10;

interface RecentPage {
  label: string;
  href: string;
}

interface SearchResult {
  id: string;
  type: "contact" | "pipeline" | "content" | "task";
  title: string;
  subtitle: string | null;
  href: string;
}

const staticRoutes = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Master Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Import", href: "/admin/import", icon: Upload },
  { label: "Finance", href: "/finance", icon: DollarSign },
  { label: "Content", href: "/content", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

const projectWorkspaces = [
  { label: "Personize", id: "personize" },
  { label: "MEEK", id: "meek" },
  { label: "Hackathons", id: "hackathons" },
  { label: "Infrastructure", id: "infrastructure" },
  { label: "Eventium", id: "eventium" },
  { label: "Telco", id: "telco" },
];

const typeIcons = {
  contact: Users,
  pipeline: Layers,
  content: FileText,
  task: CheckSquare,
} as const;

const typeLabels = {
  contact: "Contacts",
  pipeline: "Pipeline",
  content: "Content",
  task: "Tasks",
} as const;

const groupHeadingClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#666]";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground aria-selected:bg-accent aria-selected:text-foreground";

function getRecentPages(): RecentPage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_PAGES_KEY);
    return stored ? JSON.parse(stored) : [];
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

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) setOpenCount((c) => c + 1);
          return !prev;
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset state when closing
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [open]);

  // Debounced search
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
          `/api/search?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results);
        }
      } catch {
        // Silently fail — results stay empty
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recentPages = useMemo(() => getRecentPages(), [openCount]);

  const navigateTo = useCallback(
    (href: string, label: string) => {
      addRecentPage({ label, href });
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // Group search results by type
  const groupedResults = useMemo(() => {
    const groups: Partial<Record<SearchResult["type"], SearchResult[]>> = {};
    for (const result of searchResults) {
      if (!groups[result.type]) groups[result.type] = [];
      groups[result.type]!.push(result);
    }
    return groups;
  }, [searchResults]);

  const hasSearchResults = searchResults.length > 0;
  const isActiveSearch = query.length >= 2;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div className="fixed top-[20%] left-1/2 w-full max-w-[640px] -translate-x-1/2">
        <Command
          className="rounded-xl border border-border bg-card text-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
          loop
          shouldFilter={!isActiveSearch}
        >
          <div className="flex items-center border-b border-border px-4">
            {isSearching ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-[#888]" />
            ) : (
              <Search className="mr-2 h-4 w-4 shrink-0 text-[#888]" />
            )}
            <Command.Input
              placeholder="Search contacts, tasks, pipeline, content..."
              className="flex h-12 w-full bg-transparent text-sm text-foreground placeholder:text-[#666] outline-none"
              value={query}
              onValueChange={setQuery}
            />
          </div>
          <Command.List className="max-h-[320px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[#666]">
              {isActiveSearch
                ? "No results found."
                : "Start typing to search across all entities."}
            </Command.Empty>

            {/* Search results — shown when actively searching */}
            {isActiveSearch &&
              hasSearchResults &&
              (
                Object.entries(groupedResults) as [
                  SearchResult["type"],
                  SearchResult[],
                ][]
              ).map(([type, results]) => {
                const Icon = typeIcons[type];
                return (
                  <Command.Group
                    key={type}
                    heading={typeLabels[type]}
                    className={groupHeadingClass}
                  >
                    {results.map((result) => (
                      <Command.Item
                        key={`search-${result.id}`}
                        value={`search ${result.type} ${result.title} ${result.subtitle ?? ""}`}
                        onSelect={() =>
                          navigateTo(result.href, result.title)
                        }
                        className={itemClass}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-[#888]" />
                        <div className="flex min-w-0 flex-1 items-baseline gap-2">
                          <span className="truncate">{result.title}</span>
                          {result.subtitle && (
                            <span className="truncate text-xs text-[#666]">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}

            {/* Default groups — shown when NOT actively searching */}
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
                        <Clock className="h-4 w-4 text-[#888]" />
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
                      <route.icon className="h-4 w-4 text-[#888]" />
                      {route.label}
                    </Command.Item>
                  ))}
                  {projectWorkspaces.map((project) => (
                    <Command.Item
                      key={project.id}
                      value={`${project.label} project workspace`}
                      onSelect={() =>
                        navigateTo(
                          `/projects/${project.id}`,
                          `${project.label} Workspace`
                        )
                      }
                      className={itemClass}
                    >
                      <FolderOpen className="h-4 w-4 text-[#888]" />
                      {project.label} Workspace
                    </Command.Item>
                  ))}
                </Command.Group>

                <Command.Group
                  heading="Create"
                  className={groupHeadingClass}
                >
                  <Command.Item
                    value="Create Task"
                    onSelect={() => {
                      setOpen(false);
                      router.push("/tasks?create=true");
                    }}
                    className={itemClass}
                  >
                    <Plus className="h-4 w-4 text-[#888]" />
                    Create Task
                  </Command.Item>
                </Command.Group>
              </>
            )}
          </Command.List>

          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-[#666]">
            <div className="flex gap-3">
              <span>
                <kbd className="rounded bg-border px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                  ↑↓
                </kbd>{" "}
                Navigate
              </span>
              <span>
                <kbd className="rounded bg-border px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                  ↵
                </kbd>{" "}
                Select
              </span>
              <span>
                <kbd className="rounded bg-border px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                  esc
                </kbd>{" "}
                Close
              </span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
