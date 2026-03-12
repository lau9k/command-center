"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Kanban, Mail } from "lucide-react";

const TABS = [
  { label: "Pipeline", href: "/sponsors", icon: Kanban },
  { label: "Outreach", href: "/sponsors/outreach", icon: Mail },
] as const;

export function SponsorSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-lg bg-muted p-[3px]" aria-label="Sponsor navigation">
      {TABS.map((tab) => {
        const isActive =
          tab.href === "/sponsors"
            ? pathname === "/sponsors"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
