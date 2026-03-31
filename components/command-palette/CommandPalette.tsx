"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Clock,
  Compass,
  FolderOpen,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  navigationRegistry,
  filterRegistry,
} from "@/lib/command-registry";
import {
  QuickCreateMenu,
  QuickCreateForm,
} from "@/components/command-palette/quick-create-actions";
import {
  SearchResults,
  type SearchResultItem,
} from "@/components/command-palette/search-results";

// ── Constants ────────────────────────────────────────────

const RECENT_PAGES_KEY = "command-palette-recent-pages";
const MAX_RECENT = 10;
const SEARCH_DEBOUNCE_MS = 300;

type IntentTab = "navigate" | "create" | "search" | "recent";
type CreateType = "task" | "contact" | "pipeline";

interface RecentPage {
  label: string;
  href: string;
}

const tabs: Array<{ id: IntentTab; label: string; icon: typeof Compass }> = [
  { id: "navigate", label: "Navigate", icon: Compass },
  { id: "create", label: "Create", icon: Plus },
  { id: "search", label: "Search", icon: Search },
  { id: "recent", label: "Recent", icon: Clock },
];

const projectWorkspaces = [
  { id: "personize", name: "Personize" },
  { id: "meek", name: "MEEK" },
  { id: "hackathons", name: "Hackathons" },
  { id: "infrastructure", name: "Infrastructure" },
  { id: "eventium", name: "Eventium" },
  { id: "telco", name: "Telco" },
];

const groupHeadingClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#666]";

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground aria-selected:bg-accent aria-selected:text-foreground";

// ── Recent pages helpers ─────────────────────────────────

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

// ── Component ────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [openCount, setOpenCount] = useState(0);
  const [activeTab, setActiveTab] = useState<IntentTab>("navigate");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [createType, setCreateType] = useState<CreateType | null>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Keyboard shortcut
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
      setActiveTab("navigate");
      setCreateType(null);
    }
  }, [open]);

  // Unified debounced search — fires on navigate and search tabs
  const shouldSearch =
    (activeTab === "navigate" || activeTab === "search") && query.length >= 2;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!shouldSearch) {
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
        // Silently fail
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, shouldSearch]);

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

  // Filtered nav items for navigate tab
  const filteredNavItems = useMemo(
    () => filterRegistry(navigationRegistry, query),
    [query]
  );

  const filteredProjectItems = useMemo(() => {
    if (!query.trim()) return projectWorkspaces;
    const q = query.toLowerCase();
    return projectWorkspaces.filter((p) =>
      p.name.toLowerCase().includes(q)
    );
  }, [query]);

  // Filtered recent pages
  const filteredRecent = useMemo(() => {
    if (!query.trim()) return recentPages;
    const q = query.toLowerCase();
    return recentPages.filter((p) => p.label.toLowerCase().includes(q));
  }, [query, recentPages]);

  const isActiveSearch = shouldSearch;

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
          shouldFilter={
            (activeTab === "navigate" && !isActiveSearch) ||
            activeTab === "recent"
          }
        >
          {/* Tab bar */}
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setQuery("");
                  setSearchResults([]);
                  setCreateType(null);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search input — hidden on create tab when a form is open */}
          {!(activeTab === "create" && createType) && (
            <div className="flex items-center border-b border-border px-4">
              {isSearching ? (
                <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin text-[#888]" />
              ) : (
                <Search className="mr-2 h-4 w-4 shrink-0 text-[#888]" />
              )}
              <Command.Input
                placeholder={
                  activeTab === "search"
                    ? "Search across all modules..."
                    : activeTab === "create"
                      ? "Filter create actions..."
                      : activeTab === "recent"
                        ? "Filter recent pages..."
                        : "Search or go to page..."
                }
                className="flex h-12 w-full bg-transparent text-sm text-foreground placeholder:text-[#666] outline-none"
                value={query}
                onValueChange={setQuery}
              />
            </div>
          )}

          <Command.List className="max-h-[320px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[#666]">
              {isActiveSearch
                ? "No results found."
                : activeTab === "search"
                  ? "Start typing to search across all modules."
                  : activeTab === "recent" && recentPages.length === 0
                    ? "No recent pages yet."
                    : "No matches found."}
            </Command.Empty>

            {/* ── Navigate tab (unified: nav + cross-module search) ── */}
            {activeTab === "navigate" && (
              <>
                <Command.Group
                  heading="Modules"
                  className={groupHeadingClass}
                >
                  {filteredNavItems
                    .filter((item) => item.section === "module")
                    .map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.keywords.join(" ")}`}
                        onSelect={() => navigateTo(item.href, item.label)}
                        className={itemClass}
                      >
                        <item.icon className="h-4 w-4 text-[#888]" />
                        {item.label}
                      </Command.Item>
                    ))}
                </Command.Group>

                {filteredProjectItems.length > 0 && (
                  <Command.Group
                    heading="Projects"
                    className={groupHeadingClass}
                  >
                    {filteredProjectItems.map((project) => (
                      <Command.Item
                        key={project.id}
                        value={`${project.name} project workspace`}
                        onSelect={() =>
                          navigateTo(
                            `/projects/${project.id}`,
                            `${project.name} Workspace`
                          )
                        }
                        className={itemClass}
                      >
                        <FolderOpen className="h-4 w-4 text-[#888]" />
                        {project.name} Workspace
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Cross-module search results in navigate tab */}
                {isActiveSearch && (
                  <SearchResults
                    results={searchResults}
                    onSelect={navigateTo}
                  />
                )}

                {/* Quick actions placeholder — BAS-319 will add actions here */}
              </>
            )}

            {/* ── Create tab ───────────────────── */}
            {activeTab === "create" && !createType && (
              <QuickCreateMenu onSelect={setCreateType} />
            )}

            {/* ── Search tab ───────────────────── */}
            {activeTab === "search" && isActiveSearch && (
              <SearchResults
                results={searchResults}
                onSelect={navigateTo}
              />
            )}

            {/* ── Recent tab ───────────────────── */}
            {activeTab === "recent" && filteredRecent.length > 0 && (
              <Command.Group
                heading="Recent Pages"
                className={groupHeadingClass}
              >
                {filteredRecent.map((page) => (
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
          </Command.List>

          {/* Create form — rendered outside Command.List to avoid cmdk filtering */}
          {activeTab === "create" && createType && (
            <div className="border-t border-border">
              <QuickCreateForm
                type={createType}
                onBack={() => setCreateType(null)}
                onCreated={() => setOpen(false)}
              />
            </div>
          )}

          {/* Footer */}
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
