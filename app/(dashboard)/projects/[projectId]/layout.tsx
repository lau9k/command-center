import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { SessionPromptButton } from "@/components/dashboard/SessionPromptButton";

const statusColors: Record<string, string> = {
  active: "bg-[#22C55E]/20 text-[#22C55E]",
  paused: "bg-[#EAB308]/20 text-[#EAB308]",
  completed: "bg-[#3B82F6]/20 text-[#3B82F6]",
  archived: "bg-[#6B7280]/20 text-[#6B7280]",
};

interface Tab {
  label: string;
  href: string;
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single<Project>();

  if (error || !project) {
    notFound();
  }

  const tabs: Tab[] = [
    { label: "Summary", href: `/projects/${projectId}` },
    { label: "Pipeline", href: `/projects/${projectId}/pipeline` },
    { label: "Tasks", href: `/projects/${projectId}/tasks` },
    { label: "Contacts", href: `/projects/${projectId}/contacts` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
          <Badge className={statusColors[project.status] ?? ""}>
            {project.status}
          </Badge>
          <SessionPromptButton projectKey={project.name.toLowerCase()} />
        </div>
        {project.description && (
          <p className="mt-1 text-muted-foreground">{project.description}</p>
        )}
      </div>

      <nav className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-foreground transition-colors -mb-px"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
