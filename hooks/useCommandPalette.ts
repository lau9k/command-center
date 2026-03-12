"use client";

import { useEffect, useCallback } from "react";

export function useCommandPalette(
  isOpen: boolean,
  setIsOpen: (open: boolean) => void
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    },
    [isOpen, setIsOpen]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
