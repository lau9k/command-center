import { createClient } from "@/lib/supabase/server";
import { MasterTaskList } from "@/components/dashboard/MasterTaskList";
import type { TaskWithProject } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();

  const [{ data: tasks }, { data: projects }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, projects(id, name, color)")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  return (
    <MasterTaskList
      initialTasks={(tasks as TaskWithProject[]) ?? []}
      projects={projects ?? []}
    />
  );
}
