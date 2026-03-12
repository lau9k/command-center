"use client";

import { useState, useCallback, useMemo } from "react";

export function useTaskSelection(visibleIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      if (allSelected) {
        return new Set();
      }
      return new Set(visibleIds);
    });
  }, [visibleIds]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const allSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id)),
    [visibleIds, selectedIds]
  );

  const someSelected = useMemo(
    () => visibleIds.some((id) => selectedIds.has(id)) && !allSelected,
    [visibleIds, selectedIds, allSelected]
  );

  const count = selectedIds.size;

  return {
    selectedIds,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
    count,
  };
}
