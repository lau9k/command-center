import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import { OutreachQueue } from "@/components/tasks/outreach-queue";
import { TasksViewToggle } from "@/components/tasks/tasks-view-toggle";
import { seedTasksIfEmpty } from "@/lib/seed-tasks";
import { PageHeader } from "@/components/shared/PageHeader";
import { getQueryClient } from "@/lib/query-client";
import type { TaskWithProject } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  await seedTasksIfEmpty();

  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["tasks", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "*, projects(id, name, color), contacts(name, email, company, linkedin_url)"
        )
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[Outreach] query error:", error.message);
        return [];
      }
      return (data as TaskWithProject[]) ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outreach Queue"
        description="Manage outreach tasks, follow-ups, and sequences"
        actions={<TasksViewToggle />}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <OutreachQueue />
      </HydrationBoundary>
    </div>
  );
}
