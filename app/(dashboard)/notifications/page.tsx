import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const metadata: Metadata = { title: "Notifications" };
import { createServiceClient } from "@/lib/supabase/service";
import { PageHeader } from "@/components/shared/PageHeader";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";
import { getQueryClient } from "@/lib/query-client";
import type { Notification } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  // Prefetch first page of notifications and unread count
  const [, countResult] = await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["notifications", "inbox", "all", "all", 1],
      queryFn: async () => {
        const { data, error, count } = await supabase
          .from("notifications")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(0, 19);

        if (error) {
          return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
        }

        const total = count ?? 0;
        return {
          data: (data as Notification[]) ?? [],
          total,
          page: 1,
          pageSize: 20,
          totalPages: Math.ceil(total / 20),
        };
      },
    }),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("read", false),
  ]);

  const unreadCount = countResult.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Unified inbox for all alerts, tasks, and updates"
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <NotificationInbox initialUnreadCount={unreadCount} />
      </HydrationBoundary>
    </div>
  );
}
