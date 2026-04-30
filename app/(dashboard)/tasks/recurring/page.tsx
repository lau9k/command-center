import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/shared/PageHeader";
import { RecurringTaskList } from "@/components/tasks/RecurringTaskList";
import { TasksViewToggle } from "@/components/tasks/tasks-view-toggle";

export const revalidate = 300;

export default async function RecurringTasksPage() {
  const supabase = createServiceClient();

  const { data: templates } = await supabase
    .from("tasks")
    .select("*, projects(id, name, color)")
    .eq("is_recurring_template", true)
    .order("updated_at", { ascending: false });

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, color")
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Tasks"
        description="Manage task schedules that automatically generate new tasks"
        actions={<TasksViewToggle />}
      />
      <RecurringTaskList
        initial={templates ?? []}
        projects={projects ?? []}
      />
    </div>
  );
}
