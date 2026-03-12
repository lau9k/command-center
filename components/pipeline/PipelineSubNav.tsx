"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Board", href: "/pipeline", icon: LayoutGrid },
  { label: "Analytics", href: "/pipeline/analytics", icon: BarChart3 },
] as const;

export function PipelineSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 rounded-lg border border-border bg-card p-1">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/pipeline"
            ? pathname === "/pipeline"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
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
