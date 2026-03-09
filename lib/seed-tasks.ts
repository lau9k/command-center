import { createServiceClient } from "@/lib/supabase/service";

export async function seedTasksIfEmpty() {
  const supabase = createServiceClient();

  // Check if tasks table has any rows
  const { count, error: countError } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true });

  if (countError) {
    console.error("[seed-tasks] count error:", countError.message);
    return;
  }

  if ((count ?? 0) > 0) return;

  // Fetch projects to assign tasks to real project IDs
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name");

  const projectMap = new Map(
    (projects ?? []).map((p: { id: string; name: string }) => [p.name, p.id])
  );

  const now = new Date();
  const daysFromNow = (d: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    return date.toISOString().slice(0, 10);
  };

  const seedTasks = [
    {
      title: "Set up CI/CD pipeline for Personize",
      project_id: projectMap.get("Personize") ?? null,
      priority: "high",
      status: "in_progress",
      due_date: daysFromNow(2),
      assignee: "Cyrus",
    },
    {
      title: "Design sponsor deck for MEEK event",
      project_id: projectMap.get("MEEK") ?? null,
      priority: "high",
      status: "todo",
      due_date: daysFromNow(5),
      assignee: "Cyrus",
    },
    {
      title: "Review hackathon submissions",
      project_id: projectMap.get("Hackathon") ?? null,
      priority: "medium",
      status: "todo",
      due_date: daysFromNow(3),
      assignee: null,
    },
    {
      title: "Update personal budget spreadsheet",
      project_id: projectMap.get("Personal") ?? null,
      priority: "low",
      status: "todo",
      due_date: daysFromNow(7),
      assignee: "Cyrus",
    },
    {
      title: "Write launch blog post for Eventium",
      project_id: projectMap.get("Eventium") ?? null,
      priority: "medium",
      status: "done",
      due_date: daysFromNow(-1),
      assignee: "Cyrus",
    },
  ];

  const { error: insertError } = await supabase.from("tasks").insert(seedTasks);

  if (insertError) {
    console.error("[seed-tasks] insert error:", insertError.message);
  } else {
    console.log("[seed-tasks] Seeded 5 example tasks");
  }
}
