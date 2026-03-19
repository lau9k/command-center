import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserNav } from "@/components/dashboard/user-nav";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types/project";
import type { Notification } from "@/lib/types/database";

interface HeaderProps {
  projects: Project[];
}

export async function Header({ projects }: HeaderProps) {
  let userEmail: string | null = null;
  let notifications: Notification[] = [];
  let unreadCount = 0;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;

    if (user) {
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
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
      <div className="ml-auto flex items-center gap-3">
        <NotificationBell
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
        />
        <Separator orientation="vertical" className="h-5" />
        <ThemeToggle />
        <Separator orientation="vertical" className="h-5" />
        <UserNav email={userEmail} />
      </div>
    </header>
  );
}
