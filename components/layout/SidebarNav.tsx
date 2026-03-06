"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  DollarSign,
  FileText,
  FolderOpen,
  Settings,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Project } from "@/lib/types/project";

const modules = [
  { label: "Master Tasks", href: "/", icon: CheckSquare },
  { label: "Import", href: "/import", icon: Upload },
  { label: "Finance", href: "/finance", icon: DollarSign },
  { label: "Content", href: "/content", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarNavProps {
  projects: Project[];
}

export function SidebarNav({ projects }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Command Center
        </Link>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-1">
          <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Modules
          </p>
          {modules.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <Separator className="my-3" />

        <div className="space-y-1">
          <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Projects
          </p>
          {projects.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              No projects yet
            </p>
          ) : (
            projects.map((project) => {
              const href = `/projects/${project.id}`;
              const isActive = pathname.startsWith(href);

              return (
                <Link
                  key={project.id}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                  {project.name}
                </Link>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
