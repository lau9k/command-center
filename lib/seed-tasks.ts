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

  // Fetch first project to get the owner user_id for seed data
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, user_id")
    .order("name");

  const projectList = (projects ?? []) as { id: string; name: string; user_id: string }[];
  const projectMap = new Map(projectList.map((p) => [p.name, p.id]));
  const ownerId = projectList[0]?.user_id ?? null;

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
      ...(ownerId && { user_id: ownerId }),
    },
    {
      title: "Design sponsor deck for MEEK event",
      project_id: projectMap.get("MEEK") ?? null,
      priority: "high",
      status: "todo",
      due_date: daysFromNow(5),
      assignee: "Cyrus",
      ...(ownerId && { user_id: ownerId }),
    },
    {
      title: "Review hackathon submissions",
      project_id: projectMap.get("Hackathon") ?? null,
      priority: "medium",
      status: "todo",
      due_date: daysFromNow(3),
      assignee: null,
      ...(ownerId && { user_id: ownerId }),
    },
    {
      title: "Update personal budget spreadsheet",
      project_id: projectMap.get("Personal") ?? null,
      priority: "low",
      status: "todo",
      due_date: daysFromNow(7),
      assignee: "Cyrus",
      ...(ownerId && { user_id: ownerId }),
    },
    {
      title: "Write launch blog post for Eventium",
      project_id: projectMap.get("Eventium") ?? null,
      priority: "medium",
      status: "done",
      due_date: daysFromNow(-1),
      assignee: "Cyrus",
      ...(ownerId && { user_id: ownerId }),
    },
  ];

  const { error: insertError } = await supabase.from("tasks").insert(seedTasks);

  if (insertError) {
    console.error("[seed-tasks] insert error:", insertError.message);
  } else {
    console.log("[seed-tasks] Seeded 5 example tasks");
  }
}
