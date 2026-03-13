"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Tab {
  label: string;
  href: string;
}

interface ProjectSubNavProps {
  projectId: string;
}

export function ProjectSubNav({ projectId }: ProjectSubNavProps) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { label: "Summary", href: `/projects/${projectId}` },
    { label: "Tasks", href: `/projects/${projectId}/tasks` },
    { label: "Contacts", href: `/projects/${projectId}/contacts` },
    { label: "Pipeline", href: `/projects/${projectId}/pipeline` },
    { label: "Content", href: `/projects/${projectId}/content` },
    { label: "Events", href: `/projects/${projectId}/events` },
  ];

  function isActive(href: string): boolean {
    if (href === `/projects/${projectId}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2",
            isActive(tab.href)
              ? "text-foreground border-foreground"
              : "text-muted-foreground border-transparent hover:text-foreground hover:border-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
