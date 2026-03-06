import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MobileSidebar } from "./MobileSidebar";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
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
      <MobileSidebar projects={projects} />

      <h1 className="text-lg font-semibold">Command Center</h1>

      <div className="ml-auto flex items-center gap-3">
        <NotificationBell
          initialNotifications={notifications}
          initialUnreadCount={unreadCount}
        />
        {userEmail && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userEmail}
            </span>
          </>
        )}
        <Separator orientation="vertical" className="h-5" />
        <form action="/auth/sign-out" method="post">
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
