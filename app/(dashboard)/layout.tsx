import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types/project";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let projects: Project[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select("id, name, sort_order, created_at")
      .order("sort_order", { ascending: true });

    projects = (data as Project[]) ?? [];
  } catch {
    // Supabase not configured yet
  }

  return (
    <div className="flex h-screen">
      <Sidebar projects={projects} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header projects={projects} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
