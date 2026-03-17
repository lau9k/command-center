"use client";

import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/dashboard/user-nav";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { useSearch } from "@/components/search/SearchProvider";
import { openMobileSidebar } from "./ResponsiveSidebar";
import type { Notification } from "@/lib/types/database";

interface MobileHeaderProps {
  email: string | null;
  unreadCount: number;
  initialNotifications?: Notification[];
}

export function MobileHeader({ email, unreadCount, initialNotifications = [] }: MobileHeaderProps) {
  const { openSearch } = useSearch();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={openMobileSidebar}
        className="min-h-[44px] min-w-[44px] md:hidden"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>

      <h1 className="text-lg font-semibold md:hidden">Command Center</h1>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={openSearch}
          className="min-h-[44px] min-w-[44px]"
          aria-label="Open search"
        >
          <Search className="h-5 w-5" />
        </Button>
        <NotificationBell
          initialNotifications={initialNotifications}
          initialUnreadCount={unreadCount}
        />
        <UserNav email={email} />
      </div>
    </header>
  );
}
