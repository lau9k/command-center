import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const metadata: Metadata = { title: "Tasks" };
import { createServiceClient } from "@/lib/supabase/service";
import { MasterTaskList } from "@/components/dashboard/MasterTaskList";
import type { TaskStatus, TaskWithProject } from "@/lib/types/database";
import { seedTasksIfEmpty } from "@/lib/seed-tasks";
import { getQueryClient } from "@/lib/query-client";

export const dynamic = "force-dynamic";

const OPEN_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked"];
const KNOWN_STATUSES: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  // Seed example tasks if table is empty
  await seedTasksIfEmpty();

  const params = await searchParams;
  const rawFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const filter =
    rawFilter === "all" ||
    rawFilter === "open" ||
    (rawFilter && (KNOWN_STATUSES as string[]).includes(rawFilter))
      ? rawFilter
      : "open";

  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  // Fetch the full dataset once — used for KPIs and (subset) for prefetch cache.
  const { data: allTasksData, error: allTasksError } = await supabase
    .from("tasks")
    .select("*, projects(id, name, color)")
    .order("created_at", { ascending: false });
  if (allTasksError) {
    console.error("[Tasks] query error:", allTasksError.message);
  }
  const allTasks: TaskWithProject[] =
    (allTasksData as TaskWithProject[] | null) ?? [];

  const filteredForPrefetch =
    filter === "all"
      ? allTasks
      : filter === "open"
        ? allTasks.filter((t) => OPEN_STATUSES.includes(t.status))
        : allTasks.filter((t) => t.status === filter);

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["tasks", "list"],
      queryFn: async () => filteredForPrefetch,
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
  );
}
