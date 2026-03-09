"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Listens for Supabase real-time changes on key tables and triggers
 * a Next.js router refresh so KPI cards update without a full page reload.
 */
const WATCHED_TABLES = ["contacts", "tasks", "content_posts", "pipeline_items"];

export function DashboardRefreshListener() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase.channel("dashboard-kpi-refresh");

    for (const table of WATCHED_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          router.refresh();
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, supabase]);

  return null;
}
