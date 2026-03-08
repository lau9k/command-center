import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types/project";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let projects: Project[] = [];
  let hasMeekWallet = false;

  try {
    const supabase = await createClient();
    const [projectsRes, meekRes] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, sort_order, created_at")
        .order("sort_order", { ascending: true }),
      supabase
        .from("crypto_balances")
        .select("id")
        .eq("wallet", "MEEK")
        .limit(1),
    ]);

    projects = (projectsRes.data as Project[]) ?? [];
    hasMeekWallet = (meekRes.data?.length ?? 0) > 0;
  } catch {
    // Supabase not configured yet
  }

  return (
    <div className="flex h-screen">
      <Sidebar projects={projects} hasMeekWallet={hasMeekWallet} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header projects={projects} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
