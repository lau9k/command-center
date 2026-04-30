"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { List, LayoutGrid, Send, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWS = [
  { href: "/tasks", label: "Table", icon: List },
  { href: "/tasks/board", label: "Board", icon: LayoutGrid },
  { href: "/tasks/outreach", label: "Outreach", icon: Send },
  { href: "/tasks/recurring", label: "Recurring", icon: Repeat },
] as const;

const PRESERVED_PARAMS = ["filter", "showDone"] as const;

export function TasksViewToggle() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const preserved = new URLSearchParams();
  for (const key of PRESERVED_PARAMS) {
    const value = searchParams.get(key);
    if (value) preserved.set(key, value);
  }
  const preservedQs = preserved.toString();

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      {VIEWS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        const target = preservedQs ? `${href}?${preservedQs}` : href;
        return (
          <Link
            key={href}
            href={target}
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
