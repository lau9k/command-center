"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWS = [
  { href: "/tasks", label: "Table", icon: List },
  { href: "/tasks/board", label: "Board", icon: LayoutGrid },
] as const;

export function TasksViewToggle() {
  const pathname = usePathname();

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      {VIEWS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
