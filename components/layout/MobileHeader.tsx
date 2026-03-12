"use client";

import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/dashboard/user-nav";
import { openMobileSidebar } from "./ResponsiveSidebar";

interface MobileHeaderProps {
  email: string | null;
  unreadCount: number;
}

export function MobileHeader({ email, unreadCount }: MobileHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={openMobileSidebar}
        className="md:hidden"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>

      <h1 className="text-lg font-semibold md:hidden">Command Center</h1>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
        <UserNav email={email} />
      </div>
    </header>
  );
}
