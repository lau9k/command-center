import { ResponsiveSidebar } from "@/components/layout/ResponsiveSidebar";
import { Header } from "@/components/layout/Header";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { CommandPaletteProvider } from "@/components/search/CommandPaletteProvider";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types/project";
import type { Notification } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let projects: Project[] = [];
  let hasMeekWallet = false;
  let userEmail: string | null = null;
  let unreadCount = 0;
  let notifications: Notification[] = [];

  try {
    const supabase = await createClient();
    const [projectsRes, meekRes, userRes] = await Promise.all([
      supabase
        .from("projects")
        .select("id, name, sort_order, created_at")
        .order("sort_order", { ascending: true }),
      supabase
        .from("crypto_balances")
        .select("id")
        .eq("wallet", "MEEK")
        .limit(1),
      supabase.auth.getUser(),
    ]);

    projects = (projectsRes.data as Project[]) ?? [];
    hasMeekWallet = (meekRes.data?.length ?? 0) > 0;
    userEmail = userRes.data?.user?.email ?? null;

    if (userRes.data?.user) {
      const [{ data: notifData }, { count }] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("read", false),
      ]);

      notifications = (notifData as Notification[]) ?? [];
      unreadCount = count ?? 0;
    }
  } catch {
    // Supabase not configured yet
  }

  return (
    <CommandPaletteProvider>
      <div className="flex h-screen">
        <ResponsiveSidebar projects={projects} hasMeekWallet={hasMeekWallet} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile header: hamburger + bell + avatar (visible < lg) */}
          <MobileHeader email={userEmail} unreadCount={unreadCount} initialNotifications={notifications} />
          {/* Desktop header: full header (visible >= lg) */}
          <div className="hidden lg:block">
            <Header projects={projects} />
          </div>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
