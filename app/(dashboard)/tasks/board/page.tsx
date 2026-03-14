import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import { TaskBoard } from "@/components/tasks/task-board";
import { TasksViewToggle } from "@/components/tasks/tasks-view-toggle";
import type { TaskWithProject } from "@/lib/types/database";
import { seedTasksIfEmpty } from "@/lib/seed-tasks";
import { PageHeader } from "@/components/shared/PageHeader";
import { getQueryClient } from "@/lib/query-client";

export const dynamic = "force-dynamic";

export default async function TasksBoardPage() {
  await seedTasksIfEmpty();

  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["tasks", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, projects(id, name, color)")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[Tasks Board] query error:", error.message);
        return [];
      }
      return (data as TaskWithProject[]) ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Kanban board view"
        actions={<TasksViewToggle />}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TaskBoard />
      </HydrationBoundary>
    </div>
  );
}
