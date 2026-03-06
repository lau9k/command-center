import { createClient } from "@/lib/supabase/server";
import { TopTasksList } from "@/components/dashboard/TopTasksList";
import { MemoryHealthCards } from "@/components/dashboard/MemoryHealthCards";
import { QuickActions } from "@/components/dashboard/QuickActions";
import type { TaskWithProject, MemoryStat } from "@/lib/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: tasks },
    { data: projects },
    { data: memoryStats },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, projects(id, name, color)")
      .neq("status", "done")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name, color")
      .order("name", { ascending: true }),
    supabase
      .from("memory_stats")
      .select("*"),
  ]);

  const projectList = projects ?? [];
  const statsList = (memoryStats as MemoryStat[]) ?? [];

  const projectsWithMemory = projectList.map((project) => ({
    ...project,
    memoryStats: statsList.filter((s) => s.project_id === project.id),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of tasks, memory health, and activity across all projects
        </p>
      </div>

      {/* Quick Actions */}
      <section>
        <QuickActions projects={projectList} />
      </section>

      {/* Top 20 Tasks */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top Tasks</h2>
        <TopTasksList
          initialTasks={(tasks as TaskWithProject[]) ?? []}
        />
      </section>

      {/* Memory Health Cards */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Memory Health</h2>
        <MemoryHealthCards projects={projectsWithMemory} />
      </section>
    </div>
  );
}
