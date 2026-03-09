import { createServiceClient } from "@/lib/supabase/service";
import { MasterTaskList } from "@/components/dashboard/MasterTaskList";
import type { TaskWithProject } from "@/lib/types/database";
import { seedTasksIfEmpty } from "@/lib/seed-tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  // Seed example tasks if table is empty
  await seedTasksIfEmpty();

  const supabase = createServiceClient();

  const [tasksRes, projectsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, projects(id, name, color)")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  if (tasksRes.error) {
    console.error("[Tasks] query error:", tasksRes.error.message);
  }
  if (projectsRes.error) {
    console.error("[Tasks] projects query error:", projectsRes.error.message);
  }

  const tasks = tasksRes.data;
  const projects = projectsRes.data;
  const allTasks = (tasks as TaskWithProject[]) ?? [];

  // KPI computations
  const now = new Date();
  const today = new Date(now.toDateString());
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const totalOpen = allTasks.filter((t) => t.status !== "done").length;

  const dueThisWeek = allTasks.filter((t) => {
    if (!t.due_date || t.status === "done") return false;
    const d = new Date(t.due_date);
    return d >= today && d <= weekFromNow;
  }).length;

  const overdue = allTasks.filter((t) => {
    if (!t.due_date || t.status === "done") return false;
    return new Date(t.due_date) < today;
  }).length;

  const completedThisWeek = allTasks.filter((t) => {
    if (t.status !== "done") return false;
    const updated = new Date(t.updated_at);
    return updated >= oneWeekAgo;
  }).length;

  return (
    <MasterTaskList
      initialTasks={allTasks}
      projects={projects ?? []}
      kpis={{
        totalOpen,
        dueThisWeek,
        overdue,
        completedThisWeek,
      }}
    />
  );
}
