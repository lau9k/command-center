"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CheckSquare,
  Coins,
  DollarSign,
  FileText,
  FolderOpen,
  Handshake,
  LayoutDashboard,
  Settings,
  Upload,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Project } from "@/lib/types/project";

const modules = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Master Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Import", href: "/admin/import", icon: Upload },
  { label: "Finance", href: "/finance", icon: DollarSign },
  { label: "Meetings", href: "/meetings", icon: Calendar },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Sponsors", href: "/sponsors", icon: Handshake },
  { label: "Content", href: "/content", icon: FileText },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Community", href: "/community", icon: UsersRound },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarNavProps {
  projects: Project[];
  hasMeekWallet?: boolean;
}

export function SidebarNav({ projects, hasMeekWallet }: SidebarNavProps) {
  const pathname = usePathname();
  const financeExpanded = pathname.startsWith("/finance");

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
          Command Center
        </Link>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-0.5">
          <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Modules
          </p>
          {modules.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-sidebar-accent text-foreground before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-sidebar-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
                {item.href === "/finance" && financeExpanded && hasMeekWallet && (
                  <Link
                    href="/finance/treasury"
                    className={cn(
                      "relative ml-7 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
                      "hover:bg-accent hover:text-accent-foreground",
                      pathname === "/finance/treasury"
                        ? "text-foreground before:absolute before:left-0 before:top-0.5 before:bottom-0.5 before:w-[3px] before:rounded-full before:bg-sidebar-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <Coins className="h-3.5 w-3.5 shrink-0" />
                    Treasury
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <Separator className="my-3" />

        <div className="space-y-0.5">
          <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Projects
          </p>
          {projects.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
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
                    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-sidebar-accent text-foreground before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-sidebar-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <FolderOpen className="h-4 w-4 shrink-0" />
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
