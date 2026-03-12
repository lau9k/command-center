import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import { MasterTaskList } from "@/components/dashboard/MasterTaskList";
import type { TaskWithProject } from "@/lib/types/database";
import { seedTasksIfEmpty } from "@/lib/seed-tasks";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/shared/ExportButton";
import { getQueryClient } from "@/lib/query-client";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  // Seed example tasks if table is empty
  await seedTasksIfEmpty();

  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  // Prefetch tasks and projects into the query client
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["tasks", "list"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("tasks")
          .select("*, projects(id, name, color)")
          .order("created_at", { ascending: false });
        if (error) {
          console.error("[Tasks] query error:", error.message);
          return [];
        }
        return (data as TaskWithProject[]) ?? [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["projects", "list"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name")
          .order("name", { ascending: true });
        if (error) {
          console.error("[Tasks] projects query error:", error.message);
          return [];
        }
        return data ?? [];
      },
    }),
  ]);

  // Compute KPIs from prefetched data
  const allTasks =
    queryClient.getQueryData<TaskWithProject[]>(["tasks", "list"]) ?? [];

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
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage tasks with priority engine"
        actions={<ExportButton table="tasks" />}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <MasterTaskList
          kpis={{
            totalOpen,
            dueThisWeek,
            overdue,
            completedThisWeek,
          }}
        />
      </HydrationBoundary>
    </div>
  );
}
