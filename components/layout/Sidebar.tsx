import { SidebarNav } from "./SidebarNav";
import type { Project } from "@/lib/types/project";

interface SidebarProps {
  projects: Project[];
  hasMeekWallet?: boolean;
}

export function Sidebar({ projects, hasMeekWallet }: SidebarProps) {
  return (
    <aside className="hidden w-64 border-r bg-sidebar text-sidebar-foreground md:block">
      <SidebarNav projects={projects} hasMeekWallet={hasMeekWallet} />
    </aside>
  );
}
