"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckSquare, Send } from "lucide-react";

const TABS = [
  { href: "/tasks", label: "All Tasks", icon: CheckSquare, match: ["/tasks", "/tasks/board", "/tasks/recurring"] },
  { href: "/tasks/outreach", label: "Outreach", icon: Send, match: ["/tasks/outreach"] },
] as const;

export function TasksSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const isActive = tab.match.some((m) => pathname === m);
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
