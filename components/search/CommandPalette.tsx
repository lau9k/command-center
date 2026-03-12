"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CheckSquare,
  Users,
  BarChart3,
  FileText,
  Handshake,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface SearchResult {
  id: string;
  type: "task" | "contact" | "pipeline" | "content" | "sponsor";
  title: string;
  subtitle: string | null;
  href: string;
}

interface GroupedResults {
  label: string;
  type: string;
  icon: React.ReactNode;
  items: SearchResult[];
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  task: { label: "Tasks", icon: <CheckSquare className="size-4" /> },
  contact: { label: "Contacts", icon: <Users className="size-4" /> },
  pipeline: { label: "Pipeline", icon: <BarChart3 className="size-4" /> },
  content: { label: "Content", icon: <FileText className="size-4" /> },
  sponsor: { label: "Sponsors", icon: <Handshake className="size-4" /> },
};

interface CommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ isOpen, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const flatResults = results;

  const grouped: GroupedResults[] = Object.entries(TYPE_CONFIG)
    .map(([type, config]) => ({
      label: config.label,
      type,
      icon: config.icon,
      items: results.filter((r) => r.type === type),
    }))
    .filter((g) => g.items.length > 0);

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/search/global?q=${encodeURIComponent(q)}`
      );
      if (res.ok) {
        const data: { results: SearchResult[] } = await res.json();
        setResults(data.results);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchResults]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      // Focus input after dialog animation
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  const navigateToResult = useCallback(
    (result: SearchResult) => {
      onOpenChange(false);
      router.push(result.href);
    },
    [onOpenChange, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < flatResults.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : flatResults.length - 1
        );
      } else if (e.key === "Enter" && flatResults[activeIndex]) {
        e.preventDefault();
        navigateToResult(flatResults[activeIndex]);
      }
    },
    [flatResults, activeIndex, navigateToResult]
  );

  // Scroll active item into view
  useEffect(() => {
    const activeItem = listRef.current?.querySelector(
      `[data-index="${activeIndex}"]`
    );
    activeItem?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-xl"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center gap-2 border-b px-3">
          {isLoading ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Search className="size-4 shrink-0 text-muted-foreground" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, contacts, pipeline, content, sponsors..."
            className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          className="max-h-[300px] overflow-y-auto overscroll-contain"
        >
          {query.length >= 2 && !isLoading && results.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {query.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}

          {grouped.map((group) => {
            const groupStartIndex = flatResults.findIndex(
              (r) => r.type === group.type
            );

            return (
              <div key={group.type}>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {group.label}
                </div>
                {group.items.map((item, i) => {
                  const flatIndex = groupStartIndex + i;
                  const isActive = flatIndex === activeIndex;

                  return (
                    <button
                      key={item.id}
                      data-index={flatIndex}
                      onClick={() => navigateToResult(item)}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground hover:bg-accent/50"
                      }`}
                    >
                      <span className="shrink-0 text-muted-foreground">
                        {TYPE_CONFIG[item.type]?.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="shrink-0 truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t px-3 py-2 text-xs text-muted-foreground">
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
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
              esc
            </kbd>
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
