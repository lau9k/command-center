import { createServiceClient } from "@/lib/supabase/service";
import type { Notification, NotificationType } from "@/lib/types/database";

interface CreateNotificationParams {
  user_id: string;
  title: string;
  body?: string | null;
  type: NotificationType;
  project_id?: string | null;
  source?: string | null;
  action_url?: string | null;
}

/**
 * Server-side helper to create a notification.
 * Inserts into the notifications table and returns the new row.
 * Supabase Realtime will push the INSERT to subscribed clients automatically.
 */
export async function createNotification(params: CreateNotificationParams) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.user_id,
      title: params.title,
      body: params.body ?? null,
      type: params.type,
      project_id: params.project_id ?? null,
      source: params.source ?? null,
      action_url: params.action_url ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }

  return data;
}

// ── Inbox query helpers ────────────────────────────────────

export interface InboxQueryParams {
  type?: NotificationType;
  readStatus?: "read" | "unread" | "all";
  page?: number;
  pageSize?: number;
}

export interface InboxResult {
  data: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function queryInbox(params: InboxQueryParams): Promise<InboxResult> {
  const supabase = createServiceClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.type) {
    query = query.eq("type", params.type);
  }

  if (params.readStatus === "read") {
    query = query.eq("read", true);
  } else if (params.readStatus === "unread") {
    query = query.eq("read", false);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to query inbox: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    data: (data as Notification[]) ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function markAsRead(id: string): Promise<Notification> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`);
  }

  return data as Notification;
}

export async function bulkArchive(ids: string[]): Promise<number> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .in("id", ids);

  if (error) {
    throw new Error(`Failed to archive notifications: ${error.message}`);
  }

  return ids.length;
}

export async function getUnreadCount(): Promise<number> {
  const supabase = createServiceClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("read", false);

  if (error) {
    throw new Error(`Failed to get unread count: ${error.message}`);
  }

  return count ?? 0;
}
