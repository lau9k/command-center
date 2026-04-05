"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./SidebarNav";
import type { Project } from "@/lib/types/project";
import { cn } from "@/lib/utils";

interface ResponsiveSidebarProps {
  projects: Project[];
  hasMeekWallet?: boolean;
}

const SWIPE_THRESHOLD = 80;

export function ResponsiveSidebar({ projects, hasMeekWallet }: ResponsiveSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const touchStartX = useRef<number | null>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Close sidebar on route change
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (deltaX < -SWIPE_THRESHOLD) {
      setMobileOpen(false);
    }
    touchStartX.current = null;
  }, []);

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

      {/* Mobile: overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile: slide-in sidebar with swipe-to-dismiss */}
      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
            className="min-h-[44px] min-w-[44px] text-sidebar-foreground"
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
