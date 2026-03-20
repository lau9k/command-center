"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeQueryOptions {
  event?: PostgresChangeEvent;
  filter?: string;
  schema?: string;
}

/**
 * Bridges Supabase Realtime subscriptions with React Query cache invalidation.
 *
 * Subscribes to postgres_changes on the given table and invalidates the
 * specified query key whenever a matching event fires.
 */
export function useRealtimeQuery(
  tableName: string,
  queryKey: string[],
  options?: UseRealtimeQueryOptions
) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const event = options?.event ?? "*";
    const schema = options?.schema ?? "public";

    const channelName = `realtime:${schema}:${tableName}:${event}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event,
          schema,
          table: tableName,
          ...(options?.filter ? { filter: options.filter } : {}),
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName, options?.event, options?.filter, options?.schema]);

  return null;
}
