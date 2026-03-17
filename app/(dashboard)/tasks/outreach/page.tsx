import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/shared/PageHeader";
import { getQueryClient } from "@/lib/query-client";
import { OutreachQueue } from "@/components/tasks/outreach-queue";
import type { TaskWithProject } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
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
        console.error("[Outreach] query error:", error.message);
        return [];
      }
      return (data as TaskWithProject[]) ?? [];
    },
  });

  const allTasks =
    queryClient.getQueryData<TaskWithProject[]>(["tasks", "list"]) ?? [];

  const outreachTasks = allTasks.filter((t) =>
    t.tags?.some((tag) => tag.toLowerCase() === "outreach")
  );

  const today = new Date().toISOString().slice(0, 10);
  const totalOutreach = outreachTasks.length;
  const sentToday = outreachTasks.filter(
    (t) => t.status === "done" && t.updated_at.slice(0, 10) === today
  ).length;
  const totalDone = outreachTasks.filter((t) => t.status === "done").length;
  const responseRate =
    totalOutreach > 0 ? Math.round((totalDone / totalOutreach) * 100) : 0;
  const remaining = totalOutreach - totalDone;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outreach Queue"
        description="Track outreach tasks with contact info and LinkedIn access"
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <OutreachQueue
          kpis={{
            totalOutreach,
            sentToday,
            responseRate,
            remaining,
          }}
        />
      </HydrationBoundary>
    </div>
  );
}
