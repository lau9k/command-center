"use client";

import { useState, useCallback, useMemo } from "react";
import type { FilterCondition, SavedView } from "@/lib/filters";
import { filtersEqual } from "@/lib/filters";

interface UseActiveViewReturn {
  /** The currently loaded saved view, or null if none */
  activeView: SavedView | null;
  /** Current working filters (may differ from active view) */
  filters: FilterCondition[];
  /** Whether current filters differ from the active view */
  hasUnsavedChanges: boolean;
  /** Load a saved view and apply its filters */
  loadView: (view: SavedView) => void;
  /** Clear the active view (keeps current filters) */
  clearActiveView: () => void;
  /** Update the working filters */
  setFilters: (filters: FilterCondition[]) => void;
  /** Reset filters to match the active view */
  revertToActiveView: () => void;
}

export function useActiveView(
  initialFilters: FilterCondition[] = []
): UseActiveViewReturn {
  const [activeView, setActiveView] = useState<SavedView | null>(null);
  const [filters, setFilters] = useState<FilterCondition[]>(initialFilters);

  const hasUnsavedChanges = useMemo(() => {
    if (!activeView) return false;
    return !filtersEqual(filters, activeView.filters);
  }, [activeView, filters]);

  const loadView = useCallback((view: SavedView) => {
    setActiveView(view);
    setFilters(view.filters);
  }, []);

  const clearActiveView = useCallback(() => {
    setActiveView(null);
  }, []);

  const revertToActiveView = useCallback(() => {
    if (activeView) {
      setFilters(activeView.filters);
    }
  }, [activeView]);

  return {
    activeView,
    filters,
    hasUnsavedChanges,
    loadView,
    clearActiveView,
    setFilters,
    revertToActiveView,
  };
}
