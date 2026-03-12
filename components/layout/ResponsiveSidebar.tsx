"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./SidebarNav";
import type { Project } from "@/lib/types/project";
import { cn } from "@/lib/utils";

interface ResponsiveSidebarProps {
  projects: Project[];
  hasMeekWallet?: boolean;
}

export function ResponsiveSidebar({ projects, hasMeekWallet }: ResponsiveSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop: full sidebar with labels */}
      <aside className="hidden w-64 border-r bg-sidebar text-sidebar-foreground lg:block">
        <SidebarNav projects={projects} hasMeekWallet={hasMeekWallet} />
      </aside>

      {/* Tablet: icon-only collapsed sidebar */}
      <aside className="hidden w-16 border-r bg-sidebar text-sidebar-foreground md:block lg:hidden">
        <SidebarNav projects={projects} hasMeekWallet={hasMeekWallet} collapsed />
      </aside>

      {/* Mobile: hamburger overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute right-2 top-3 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>
        <div onClick={() => setMobileOpen(false)}>
          <SidebarNav projects={projects} hasMeekWallet={hasMeekWallet} />
        </div>
      </aside>

      {/* Hamburger trigger for MobileHeader (exposed via hidden input trick) */}
      <button
        id="mobile-sidebar-trigger"
        className="hidden"
        onClick={() => setMobileOpen(true)}
        aria-hidden
      />
    </>
  );
}

/** Hook-like helper: call this to open the mobile sidebar from MobileHeader */
export function openMobileSidebar() {
  document.getElementById("mobile-sidebar-trigger")?.click();
}
