"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  Calendar,
  CheckSquare,
  Coins,
  DollarSign,
  FileText,
  FolderOpen,
  Kanban,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Project } from "@/lib/types/project";

const modules = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Finance", href: "/finance", icon: DollarSign },
  { label: "Meetings", href: "/meetings", icon: Calendar },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Conversations", href: "/conversations", icon: MessageSquare },
  { label: "Content", href: "/content", icon: FileText },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Context Docs", href: "/context-docs", icon: BookOpen },
  { label: "Memory Health", href: "/memory-health", icon: Brain },
  { label: "Pipeline", href: "/pipeline", icon: Kanban },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarNavProps {
  projects: Project[];
  hasMeekWallet?: boolean;
  /** When true, show only icons (tablet breakpoint) */
  collapsed?: boolean;
}

export function SidebarNav({ projects, hasMeekWallet, collapsed }: SidebarNavProps) {
  const pathname = usePathname();
  const financeExpanded = pathname.startsWith("/finance");

  return (
    <div className="flex h-full flex-col">
      <div className={cn("h-14 flex items-center", collapsed ? "px-2" : "px-4")}>
        <Link
          href="/"
          className={cn(
            "flex items-center text-lg font-semibold tracking-tight text-foreground",
            collapsed ? "justify-center" : "gap-2"
          )}
          title="Command Center"
        >
          {collapsed ? (
            <LayoutDashboard className="h-5 w-5" />
          ) : (
            "Command Center"
          )}
        </Link>
      </div>

      <Separator />

      <ScrollArea className={cn("flex-1 py-3", collapsed ? "px-1" : "px-3")}>
        <div className="space-y-0.5">
          {!collapsed && (
            <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Modules
            </p>
          )}
          {modules.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex items-center rounded-md text-sm font-medium transition-all duration-150",
                    "hover:bg-accent hover:text-accent-foreground",
                    collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                    isActive
                      ? "bg-sidebar-accent text-foreground before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-sidebar-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && item.label}
                </Link>
                {!collapsed && item.href === "/finance" && financeExpanded && hasMeekWallet && (
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

        {!collapsed && (
          <>
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
          </>
        )}
      </ScrollArea>
    </div>
  );
}
