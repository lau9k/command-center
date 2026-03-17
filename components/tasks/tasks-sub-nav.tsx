"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Send } from "lucide-react";

const TABS = [
  { href: "/tasks", label: "All Tasks", icon: CheckSquare },
  { href: "/tasks/outreach", label: "Outreach Queue", icon: Send },
] as const;

export function TasksSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const isActive =
          tab.href === "/tasks"
            ? pathname === "/tasks" || pathname === "/tasks/board" || pathname === "/tasks/recurring"
            : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
