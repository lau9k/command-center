"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { CommandPalette } from "./CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";

interface CommandPaletteContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  isOpen: false,
  setIsOpen: () => {},
});

export function useCommandPaletteContext() {
  return useContext(CommandPaletteContext);
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  useCommandPalette(isOpen, setIsOpen);

  return (
    <CommandPaletteContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
      <CommandPalette isOpen={isOpen} onOpenChange={setIsOpen} />
    </CommandPaletteContext.Provider>
  );
}
